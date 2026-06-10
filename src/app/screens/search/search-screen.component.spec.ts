import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchScreenComponent } from './search-screen.component';
import { FIXTURE_CLUSTERS, FIXTURE_EDGES, FIXTURE_NODES, seedAppStore } from '../spec-helpers';

describe('SearchScreenComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await seedAppStore({
      network: {
        derivedClusters: FIXTURE_CLUSTERS,
        derivedNodes: FIXTURE_NODES,
        derivedEdges: FIXTURE_EDGES,
      },
    });
  });

  it('shows the hint when the query is empty', () => {
    const fixture = TestBed.createComponent(SearchScreenComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Type at least 2 characters',
    );
  });

  it('debounces input and calls the search endpoint', async () => {
    const fixture = TestBed.createComponent(SearchScreenComponent);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(input).not.toBeNull();
    input!.value = 'climate';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    TestBed.tick();
    // Fast-forward past the 220ms debounce so the setTimeout fires.
    vi.advanceTimersByTime(250);
    // Hand back the event loop so the (now-fired) async runSearch() runs
    // up to its `await this.api.search(...)` line and registers the HTTP
    // request with the testing controller.
    vi.useRealTimers();
    await Promise.resolve();

    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne('/api/search?q=climate');
    expect(req.request.method).toBe('GET');
    req.flush({
      results: [
        {
          type: 'node',
          id: 'n1',
          label: 'Climate',
          snippet: 'Climate overview',
          meta: 'cluster: c1',
          score: 2,
        },
      ],
    });
  });

  it('cancels the pending debounce when destroyed mid-wait', async () => {
    const fixture = TestBed.createComponent(SearchScreenComponent);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    input!.value = 'climate';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    TestBed.tick();

    // Destroy while the 220ms debounce is still pending …
    fixture.destroy();
    vi.advanceTimersByTime(250);
    vi.useRealTimers();
    await Promise.resolve();

    // … no search request may be issued by the dead component.
    const http = TestBed.inject(HttpTestingController);
    http.expectNone('/api/search?q=climate');
  });
});
