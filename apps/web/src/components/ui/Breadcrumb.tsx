import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-0.5 text-xs text-gray-400 print:hidden">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && <ChevronRight size={11} className="text-gray-300 mx-0.5" />}
          {item.href ? (
            <Link to={item.href} className="hover:text-gray-600 transition truncate max-w-[200px]">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-700 font-medium truncate max-w-[240px]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

 
