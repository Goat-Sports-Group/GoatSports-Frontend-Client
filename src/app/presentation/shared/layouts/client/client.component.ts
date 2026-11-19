import { Component, ElementRef, OnDestroy, OnInit, ViewChild, afterNextRender, inject } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from '@presentation/services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@application/dto/user/user.dto';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import { GoatMotionService } from '@shared/motion/goat-motion.service';
import { CLIENT_MASCOT_LINES } from '@shared/motion/client-mascot-lines';

@Component({
    selector: 'app-client',
    templateUrl: './client.component.html',
    styleUrls: ['./client.component.scss'],
    standalone: false
})
export class ClientComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private motion = inject(GoatMotionService);
  private host = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => {
      // Cuộn mượt gắn vào cửa sổ; chỉ khi trang không cuộn mà mat-sidenav-content tự cuộn (chiều cao cố định)
      // thì gắn vào nó.
      const root = this.host.nativeElement as HTMLElement;
      const wrapper = root.querySelector('.client-content-wrapper') as HTMLElement | null;
      const wrapperScrolls =
        !!wrapper &&
        /(auto|scroll)/.test(getComputedStyle(wrapper).overflowY) &&
        wrapper.scrollHeight > wrapper.clientHeight + 1 &&
        document.documentElement.scrollHeight <= window.innerHeight + 1;
      this.motion.start({ wrapper: wrapperScrolls ? wrapper : null, root: root.querySelector('main') });
    });
  }

  ngOnDestroy(): void {
    this.motion.stop();
  }

  @ViewChild('sidenav') sidenav!: MatSidenav;

  isAuthenticated$!: Observable<boolean>;
  currentUser: User | null = null;
  adminUrl = environment.adminApiUrl;
  readonly mascotLines = CLIENT_MASCOT_LINES;

  ngOnInit() {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  toggleSidenav() {
    this.sidenav.toggle();
  }

  closeSidenav() {
    this.sidenav.close();
  }

  private authApiBase = environment.authApiUrl;

  logout() {
    this.authService.logout().subscribe();
  }

  redirectToLogin() {
    window.location.href = `${this.authApiBase}/login?redirect=${encodeURIComponent(window.location.origin + this.router.url)}`;
  }

  get showFooter(): boolean {
    // Chat va Cong dong la trang kieu ung dung: chi phan noi dung giua cuon, khong co footer.
    return !this.router.url.startsWith('/chat') && !this.router.url.startsWith('/feed');
  }
}
