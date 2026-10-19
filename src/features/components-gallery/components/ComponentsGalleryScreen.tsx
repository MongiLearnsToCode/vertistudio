import { useMemo, useState } from 'react';
import { Panel, SearchInput } from '@shared/components';
import { sections } from '../demos';
import type { Demo, DemoSection } from '../demos';

function matches(query: string, demo: Demo): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return demo.name.toLowerCase().includes(q) || demo.description.toLowerCase().includes(q);
}

function filterSections(sections: DemoSection[], query: string): DemoSection[] {
  if (!query) return sections;
  return sections
    .map((s) => ({ ...s, demos: s.demos.filter((d) => matches(query, d)) }))
    .filter((s) => s.demos.length > 0);
}

export function ComponentsGalleryScreen() {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => filterSections(sections, query), [query]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-[40px] px-3 bg-app-surface shrink-0 border-b border-border">
        <span className="text-[13px] font-medium text-text-secondary">Components</span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-[760px] mx-auto space-y-6">
          <div>
            <p className="text-[12px] text-text-muted mb-3">{'Live demos for every shared component, with the source snippet you\'d paste into a screen. Search by name or description.'}</p>
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              size="md"
              placeholder={'Filter by name or description…'}
            />
          </div>

          {visible.length === 0 ? (
            <p className="text-[12px] text-text-muted">
              {'No components match'} <span className="font-mono">&quot;{query}&quot;</span>.
            </p>
          ) : null}

          {visible.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-[14px] font-semibold text-text-primary">{section.title}</h2>
              {section.demos.map((demo) => (
                <Panel key={demo.name} header={demo.name}>
                  <div className="p-3 space-y-3">
                    <p className="text-[11px] text-text-muted">{demo.description}</p>
                    <div className="p-3 bg-app-base rounded border border-border">
                      {demo.render()}
                    </div>
                    <pre className="text-[11px] text-text-secondary bg-app-deep rounded p-2 overflow-auto font-mono leading-snug">
                      <code>{demo.code}</code>
                    </pre>
                  </div>
                </Panel>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
