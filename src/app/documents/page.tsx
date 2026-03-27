import sourcesData from '@/data/sources.json';
import { ORG_CONFIG } from '@/lib/types';
import type { OrgCode } from '@/lib/types';

export default function DocumentsPage() {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-primary-900 mb-1">
        Source Documents
      </h2>
      <p className="text-primary-500 mb-6">
        View each kosher-for-Passover guide in full. Click to open the document.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {sourcesData.map((source) => {
          const orgConfig = ORG_CONFIG[source.org as OrgCode];
          const fileUrl = (source as { externalUrl?: string }).externalUrl ?? `/pdfs/${source.fileName}`;
          return (
            <a
              key={source.slug}
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-xl border border-primary-100 p-5 hover:shadow-lg hover:border-gold-300 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center text-2xl shrink-0">
                  {source.fileType === 'pdf' ? '📄' : '🖼️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${orgConfig?.bgColor ?? 'bg-gray-100'} ${orgConfig?.color ?? 'text-gray-700'}`}>
                      {source.org}
                    </span>
                    {source.pageCount && (
                      <span className="text-xs text-primary-400">
                        {source.pageCount} page{source.pageCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-primary-900 group-hover:text-gold-600 transition-colors">
                    {source.title}
                  </h3>
                  <p className="text-sm text-primary-400 mt-1 line-clamp-2">
                    {source.description}
                  </p>
                  <p className="text-xs text-primary-300 mt-2">
                    {source.fileName}
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
