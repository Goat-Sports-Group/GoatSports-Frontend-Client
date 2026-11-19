import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, inject } from '@angular/core';
import Lenis from 'lenis';

export interface GoatMotionOptions {
  /** Phần tử tự cuộn (khi trang không cuộn bằng cửa sổ). Bỏ trống = cửa sổ. */
  wrapper?: HTMLElement | null;
  /** Vùng nội dung được tự gắn hiệu ứng hiện dần. Bỏ trống = thẻ <main>. */
  root?: HTMLElement | null;
}

/** Khối được tự gắn hiệu ứng hiện dần khi cuộn tới (không cần sửa từng template). */
const REVEAL_SELECTOR = [
  'section',
  'article',
  'h1',
  'h2',
  '.panel',
  '.card',
  '[class*="-card"]',
  '[class*="-panel"]'
].join(',');

/** Không động vào: lớp phủ, hộp thoại, menu, tab, skeleton, phần tử tự đánh dấu data-no-reveal. */
const REVEAL_SKIP =
  '.cdk-overlay-container, [role="dialog"], [role="menu"], [role="tabpanel"], [data-no-reveal], .sk-card, .modal-card, .tab-panel, mat-sidenav';

export const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Chuyển động toàn app (theo portfolio):
 * - Cuộn mượt bằng Lenis; tự dừng khi CDK khóa cuộn (dialog), để vùng cuộn lồng nhau (bảng, menu) cuộn bình thường.
 * - Tự gắn hiệu ứng hiện dần cho section/thẻ/tiêu đề khi chúng cuộn vào màn hình. Phần tử đang nằm trong
 *   màn hình lúc xuất hiện thì giữ nguyên (không nháy), nên lọc/phân trang không làm bảng nhấp nháy.
 * Mọi vòng lặp chạy ngoài Angular zone để không kích hoạt change detection.
 */
@Injectable({ providedIn: 'root' })
export class GoatMotionService {
  private readonly zone = inject(NgZone);
  private readonly document = inject(DOCUMENT);
  private cleanups: Array<() => void> = [];
  private lenis: Lenis | null = null;

  start(options: GoatMotionOptions = {}): void {
    if (this.cleanups.length || reducedMotion()) return;
    this.zone.runOutsideAngular(() => {
      this.startSmoothScroll(options.wrapper ?? null);
      this.startReveal(options.root ?? this.document.querySelector('main') ?? this.document.body);
    });
  }

  stop(): void {
    this.cleanups.splice(0).forEach((cleanup) => cleanup());
    this.lenis = null;
  }

  /** Cuộn mượt tới đầu trang / phần tử (dùng thay window.scrollTo khi cần hiệu ứng). */
  scrollTo(target: number | string | HTMLElement, offset = 0): void {
    if (this.lenis) this.lenis.scrollTo(target, { offset });
    else if (typeof target === 'number') window.scrollTo({ top: target + offset, behavior: 'smooth' });
  }

  private startSmoothScroll(wrapper: HTMLElement | null): void {
    const html = this.document.documentElement;
    const lenis = new Lenis({
      wrapper: wrapper ?? window,
      content: (wrapper?.firstElementChild as HTMLElement | null) ?? html,
      lerp: 0.1,
      wheelMultiplier: 0.9,
      allowNestedScroll: true,
      prevent: (node) => !!node.closest?.('.cdk-overlay-container, [data-lenis-prevent], mat-sidenav')
    });
    this.lenis = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // CDK (MatDialog...) khóa cuộn bằng class trên <html>: dừng Lenis cho tới khi mở khóa.
    const scrollLock = new MutationObserver(() => {
      if (html.classList.contains('cdk-global-scrollblock')) lenis.stop();
      else lenis.start();
    });
    scrollLock.observe(html, { attributes: true, attributeFilter: ['class'] });

    this.cleanups.push(() => {
      cancelAnimationFrame(frame);
      scrollLock.disconnect();
      lenis.destroy();
    });
  }

  private startReveal(root: HTMLElement): void {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('goat-revealed');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );

    const prepare = (el: HTMLElement) => {
      if (el.dataset['goatReveal'] || el.closest(REVEAL_SKIP)) return;
      // Khối cha đang chạy hiệu ứng thì khối con đi theo nó, không gắn thêm (tránh chồng hiệu ứng).
      if (el.parentElement?.closest('[data-goat-reveal="rise"], [data-goat-reveal="flip"]')) return;
      const rect = el.getBoundingClientRect();
      // Khối rỗng, đang nằm trong màn hình, hoặc cao hơn màn hình (khung bọc cả trang): giữ nguyên,
      // để các khối con bên trong tự nhận hiệu ứng khi cuộn tới.
      if (rect.height === 0 || rect.height > window.innerHeight * 0.9 || (rect.top < window.innerHeight && rect.bottom > 0)) {
        el.dataset['goatReveal'] = 'done';
        return;
      }
      el.dataset['goatReveal'] = /^H[12]$/.test(el.tagName) ? 'flip' : 'rise';
      observer.observe(el);
    };

    const scan = (node: ParentNode) => {
      if (node instanceof HTMLElement && node.matches(REVEAL_SELECTOR)) prepare(node);
      node.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(prepare);
    };

    // Gom các thay đổi DOM trong 1 khung hình rồi mới quét phần tử mới thêm.
    let pending: HTMLElement[] = [];
    let scheduled = 0;
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) pending.push(node);
        });
      }
      if (!scheduled && pending.length) {
        scheduled = requestAnimationFrame(() => {
          scheduled = 0;
          const nodes = pending;
          pending = [];
          nodes.forEach((node) => node.isConnected && scan(node));
        });
      }
    });

    scan(root);
    mutations.observe(root, { childList: true, subtree: true });
    this.cleanups.push(() => {
      cancelAnimationFrame(scheduled);
      mutations.disconnect();
      observer.disconnect();
    });
  }
}
