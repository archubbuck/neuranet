import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavbarComponent } from '../components/navbar.component';
import { UploadViewComponent } from '../components/upload-view.component';
import { TN, TopicDoc, loadDocs, persistDocs } from '../topicnet-data';

@Component({
  selector: 'app-upload-page',
  standalone: true,
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

  constructor(public readonly router: Router) {}

  ngOnInit(): void {
    this.docs = loadDocs();
  }

  handleAddDoc(doc: TopicDoc): void {
    this.docs = [...this.docs, doc];
    persistDocs(this.docs);
  }

  onTab(tab: 'network' | 'explore' | 'upload'): void {
    if (tab === 'upload') {
      return;
    }

    this.router.navigateByUrl('/network');
  }
}
