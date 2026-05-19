import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavbarComponent } from '../components/navbar.component';
import { UploadViewComponent } from '../components/upload-view.component';
import { TN, TopicDoc } from '../topicnet-data';
import { DocsApiService } from '../services/docs-api.service';

@Component({
  selector: 'app-upload-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NavbarComponent, UploadViewComponent],
  template: `
    <div class="tn-shell">
      <app-navbar
        [activeTab]="'upload'"
        [showSidebarToggle]="false"
        [sidebarOpen]="false"
        (tab)="onTab($event)"
      ></app-navbar>

      <app-upload-view
        [docs]="docs"
        (add)="handleAddDoc($event)"
        (viewNetwork)="router.navigateByUrl('/network')"
      ></app-upload-view>
    </div>
  `,
  styles: `
    .tn-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      background: ${TN.bg};
      overflow: hidden;
    }
  `,
})
export class UploadPageComponent implements OnInit {
  docs: TopicDoc[] = [];
  readonly router = inject(Router);
  private readonly docsApi = inject(DocsApiService);

  ngOnInit(): void {
    this.docsApi.listDocs().subscribe((docs) => {
      this.docs = docs;
    });
  }

  handleAddDoc(doc: TopicDoc): void {
    this.docsApi.createDoc({ title: doc.title, text: doc.text, status: doc.status }).subscribe((savedDoc) => {
      this.docs = [...this.docs, savedDoc];
    });
  }

  onTab(tab: 'network' | 'explore' | 'upload'): void {
    if (tab === 'upload') {
      return;
    }

    this.router.navigateByUrl('/network');
  }
}
