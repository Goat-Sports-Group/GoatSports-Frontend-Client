import { Injectable, signal } from '@angular/core';

/**
 * Trạng thái mở/đóng cửa sổ GOAT AI, dùng chung giữa linh vật dê (nút mở chat) và hộp thoại trợ lý.
 */
@Injectable({ providedIn: 'root' })
export class AssistantLauncherService {
  readonly open = signal(false);

  toggle(): void {
    this.open.update((open) => !open);
  }

  close(): void {
    this.open.set(false);
  }
}
