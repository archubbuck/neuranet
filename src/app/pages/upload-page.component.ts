import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
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
        [workspaceId]="workspaceId || null"
        [workspaceName]="''"
        (tab)="onTab($event)"
      ></app-navbar>

      <app-upload-view
        [docs]="docs"
        [saveError]="saveError"
        (add)="handleAddDoc($event)"
        (viewNetwork)="navigateToNetwork()"
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
  saveError = '';
  workspaceId: number | null = null;
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly docsApi = inject(DocsApiService);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.workspaceId = id ? Number(id) : null;
      this.loadDocs();
    });
  }

  private loadDocs(): void {
    if (this.workspaceId) {
      this.docsApi.listDocs(this.workspaceId).subscribe((docs) => {
        this.docs = docs;
        this.cdr.markForCheck();
      });
    } else {
      this.docsApi.legacyListDocs().subscribe((docs) => {
        this.docs = docs;
        this.cdr.markForCheck();
      });
    }
  }

  handleAddDoc(doc: TopicDoc): void {
    this.saveError = '';
    const create$ = this.workspaceId
      ? this.docsApi.createDoc(this.workspaceId, { title: doc.title, text: doc.text, status: doc.status })
      : this.docsApi.legacyCreateDoc({ title: doc.title, text: doc.text, status: doc.status });

    create$
      .pipe(
        timeout(10000),
        finalize(() => {
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (savedDoc) => {
          this.docs = [...this.docs, savedDoc];
        },
        error: () => {
          this.saveError = 'Unable to save document. Check that the API server is running and try again.';
        },
      });
  }

  navigateToNetwork(): void {
    if (this.workspaceId) {
      this.router.navigate(['/workspace', this.workspaceId]);
    } else {
      this.router.navigateByUrl('/network');
    }
  }

  onTab(tab: 'network' | 'explore' | 'upload'): void {
    if (tab === 'upload') {
      return;
    }

    this.router.navigateByUrl('/network');
  }
}
