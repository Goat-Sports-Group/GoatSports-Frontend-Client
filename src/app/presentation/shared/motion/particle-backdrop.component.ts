import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject, input } from '@angular/core';
import type * as Three from 'three';

export type BackdropVariant = 'sphere' | 'wave';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Đọc màu primary/focus-ring hiện tại (đổi theo theme sáng/tối). */
function themeColors(doc: Document, forceDark: boolean) {
  const style = getComputedStyle(doc.documentElement);
  return {
    primary: style.getPropertyValue('--primary').trim() || '#007a55',
    accent: style.getPropertyValue('--focus-ring').trim() || '#13a879',
    dark: forceDark || doc.documentElement.dataset['theme'] === 'dark'
  };
}

/** Chấm tròn mềm cho Points. */
function dotTexture(THREE: typeof Three) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

interface Scene {
  update(t: number, pointer: { x: number; y: number }): void;
  recolor(colors: ReturnType<typeof themeColors>): void;
  resize(height: number): void;
  dispose(): void;
}

/** Cầu hạt Fibonacci + khung icosahedron + 2 quỹ đạo (giống hero portfolio). */
function sphereScene(THREE: typeof Three, scene: Three.Scene, camera: Three.PerspectiveCamera): Scene {
  camera.position.set(0, 0, 6);
  const group = new THREE.Group();
  scene.add(group);
  const texture = dotTexture(THREE);

  const count = 1500;
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    positions.set([Math.cos(golden * i) * r * 2, y * 2, Math.sin(golden * i) * r * 2], i * 3);
  }
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointsMaterial = new THREE.PointsMaterial({ size: 0.05, map: texture, transparent: true, depthWrite: false });
  group.add(new THREE.Points(pointsGeometry, pointsMaterial));

  const ico = new THREE.IcosahedronGeometry(1.25, 1);
  const edges = new THREE.EdgesGeometry(ico);
  const lineMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5 });
  const wire = new THREE.LineSegments(edges, lineMaterial);
  group.add(wire);

  const orbitMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 });
  const orbitGeometries: Three.BufferGeometry[] = [];
  const orbits = [0.9, -0.6].map((tilt, i) => {
    const curve = new THREE.EllipseCurve(0, 0, 2.55 + i * 0.25, 2.55 + i * 0.25);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(160));
    orbitGeometries.push(geometry);
    const orbit = new THREE.LineLoop(geometry, orbitMaterial);
    orbit.rotation.set(Math.PI / 2 + tilt, tilt * 0.6, 0);
    group.add(orbit);
    return orbit;
  });

  return {
    update(t, pointer) {
      group.rotation.y = t * 0.15;
      group.rotation.x += (pointer.y * 0.5 - group.rotation.x) * 0.04;
      group.position.x += (pointer.x * 0.4 - group.position.x) * 0.04;
      wire.rotation.x = t * 0.15;
      wire.rotation.z = t * 0.1;
      orbits.forEach((orbit, i) => (orbit.rotation.z = t * (i ? -0.12 : 0.08)));
      group.scale.setScalar(1 + Math.sin(t * 1.2) * 0.015);
    },
    recolor({ primary, accent, dark }) {
      pointsMaterial.color.set(dark ? accent : primary);
      pointsMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      pointsMaterial.opacity = dark ? 1 : 0.8;
      lineMaterial.color.set(primary);
      orbitMaterial.color.set(accent);
      [pointsMaterial, lineMaterial, orbitMaterial].forEach((m) => (m.needsUpdate = true));
    },
    resize() {},
    dispose() {
      [pointsGeometry, ico, edges, ...orbitGeometries].forEach((g) => g.dispose());
      [pointsMaterial, lineMaterial, orbitMaterial, texture].forEach((m) => m.dispose());
    }
  };
}

/** Mặt sóng hạt; độ cao sóng tính trong vertex shader (GPU) nên không cập nhật buffer mỗi khung hình. */
function waveScene(THREE: typeof Three, scene: Three.Scene, camera: Three.PerspectiveCamera): Scene {
  camera.position.set(0, 3.2, 8);
  camera.lookAt(0, 0.9, 0);
  const cols = 150;
  const rows = 66;
  const gap = 0.2;
  const positions = new Float32Array(cols * rows * 3);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 3;
      positions[i] = (c - cols / 2) * gap;
      positions[i + 2] = (r - rows / 2) * gap + 1.2;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 0.07 },
      uScale: { value: 300 },
      uColor: { value: new THREE.Color() },
      uAlpha: { value: 0.85 }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uSize;
      uniform float uScale;
      varying float vHeight;
      void main() {
        vec3 p = position;
        p.y = sin(p.x * 0.45 + uTime * 1.1) * 0.45 + cos(p.z * 0.6 + uTime * 0.8) * 0.35;
        vHeight = p.y;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (uScale / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uAlpha;
      varying float vHeight;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.05, d) * uAlpha;
        gl_FragColor = vec4(uColor * (0.75 + vHeight * 0.6), alpha);
      }
    `,
    transparent: true,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return {
    update(t, pointer) {
      material.uniforms['uTime'].value = t;
      points.rotation.y += (pointer.x * 0.35 - points.rotation.y) * 0.03;
      camera.position.y += (3.2 - pointer.y * 1.2 - camera.position.y) * 0.03;
      camera.lookAt(0, 0.9, 0);
    },
    recolor({ primary, accent, dark }) {
      material.uniforms['uColor'].value.set(dark ? accent : primary);
      material.uniforms['uAlpha'].value = dark ? 0.85 : 0.6;
      material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      material.needsUpdate = true;
    },
    resize(height) {
      material.uniforms['uScale'].value = height / 2;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    }
  };
}

/**
 * Nền 3D bằng Three.js: `sphere` (cầu hạt) hoặc `wave` (mặt sóng hạt). Đặt vị trí bằng class của host
 * (thường `absolute inset-0 pointer-events-none`). three chỉ tải khi component chạy; dừng render khi ra
 * khỏi màn hình; đổi màu theo theme sáng/tối; đứng yên khi người dùng bật giảm chuyển động.
 */
@Component({
  selector: 'goat-particle-backdrop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: { 'aria-hidden': 'true', class: 'goat-particle-backdrop' }
})
export class ParticleBackdropComponent implements OnDestroy {
  readonly variant = input<BackdropVariant>('sphere');
  /** `dark`: luôn vẽ kiểu nền tối (dùng trong vùng luôn navy như hero); `auto`: theo theme sáng/tối. */
  readonly tone = input<'auto' | 'dark'>('auto');

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly document = inject(DOCUMENT);
  private disposed = false;
  private cleanup: () => void = () => {};

  constructor() {
    afterNextRender(() => {
      this.zone.runOutsideAngular(() => {
        import('three').then((THREE) => {
          if (!this.disposed) this.start(THREE);
        });
      });
    });
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.cleanup();
  }

  private start(THREE: typeof Three): void {
    const container = this.host.nativeElement as HTMLElement;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    // Nền trang trí: độ phân giải 1x là đủ, nhẹ GPU hơn nhiều so với 1.5x–2x.
    renderer.setPixelRatio(1);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(this.variant() === 'wave' ? 55 : 45, 1, 0.1, 100);
    const content = this.variant() === 'wave' ? waveScene(THREE, scene, camera) : sphereScene(THREE, scene, camera);
    content.recolor(themeColors(this.document, this.tone() === 'dark'));

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      content.resize(renderer.domElement.height);
      render();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const themeObserver = new MutationObserver(() => {
      content.recolor(themeColors(this.document, this.tone() === 'dark'));
      render();
    });
    themeObserver.observe(this.document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const pointer = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      pointer.x = event.clientX / window.innerWidth - 0.5;
      pointer.y = event.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    // Đang cuộn (cửa sổ hoặc vùng cuộn bên trong) thì không vẽ, nhường GPU cho cuộn; vẽ tối đa 30 khung hình/giây.
    let scrollingUntil = 0;
    const onScroll = () => (scrollingUntil = performance.now() + 180);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });

    const reduced = reducedMotion();
    const startedAt = performance.now();
    let frame = 0;
    let lastDraw = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now < scrollingUntil || now - lastDraw < 33) return;
      lastDraw = now;
      content.update((now - startedAt) / 1000, pointer);
      render();
    };
    content.update(0, pointer);
    const visibility = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (entry.isIntersecting && !reduced) frame = requestAnimationFrame(loop);
    });
    visibility.observe(container);

    this.cleanup = () => {
      cancelAnimationFrame(frame);
      visibility.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll, { capture: true });
      content.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }
}
