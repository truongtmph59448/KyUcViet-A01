import { useCallback, useEffect, useState } from 'react';
import { Layout, type AppRoute } from './components/Layout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { RecordDetailPage } from './pages/RecordDetailPage.tsx';
import { TimelinePage } from './pages/TimelinePage.tsx';
import { GeminiAssistantPage } from './pages/GeminiAssistantPage.tsx';
import { SourcesRightsPage } from './pages/SourcesRightsPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import type { CatalogStats, HeritageRecord, SourceRecord } from './types.ts';
import { computeCatalogStats } from './utils/catalog.ts';

const FAVORITES_STORAGE_KEY = 'ky_uc_viet_favorites_v1';

function parseRoute(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return { name: 'home' };
  if (clean === '/kho-tu-lieu') return { name: 'catalog' };
  if (clean.startsWith('/tu-lieu/')) {
    const id = decodeURIComponent(clean.slice('/tu-lieu/'.length));
    return { name: 'detail', id };
  }
  if (clean === '/dong-thoi-gian') return { name: 'timeline' };
  if (clean === '/tro-ly-gemini') return { name: 'gemini' };
  if (clean === '/nguon-va-quyen') return { name: 'sources' };
  if (clean === '/gioi-thieu') return { name: 'about' };
  if (clean === '/quan-ly') return { name: 'admin' };
  return { name: 'home' };
}

export default function App() {
  const [currentUrl, setCurrentUrl] = useState(
    () => window.location.pathname + window.location.search
  );
  const [records, setRecords] = useState<HeritageRecord[]>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [stats, setStats] = useState<CatalogStats>(() => computeCatalogStats([]));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const loadPublicCatalog = useCallback(async () => {
    try {
      setLoadError(null);
      const [recRes, srcRes] = await Promise.all([
        fetch('/api/public/records'),
        fetch('/api/public/sources'),
      ]);

      if (!recRes.ok || !srcRes.ok) {
        throw new Error('Không thể tải dữ liệu hồ sơ từ máy chủ.');
      }

      const recData = (await recRes.json()) as {
        records: HeritageRecord[];
        stats: CatalogStats;
      };
      const srcData = (await srcRes.json()) as { sources: SourceRecord[] };

      setRecords(recData.records || []);
      setStats(recData.stats || computeCatalogStats(recData.records || []));
      setSources(srcData.sources || []);
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Lỗi tải dữ liệu hệ thống. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublicCatalog();
  }, [loadPublicCatalog]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentUrl(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path !== window.location.pathname + window.location.search) {
      window.history.pushState({}, '', path);
      setCurrentUrl(path);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors if private mode blocks localStorage
      }
      return next;
    });
  }, []);

  const urlObj = new URL(currentUrl, 'http://localhost');
  const route = parseRoute(urlObj.pathname);
  const initialQuery = urlObj.searchParams.get('q') || '';
  const initialTour = urlObj.searchParams.get('tour') === '1';

  return (
    <Layout route={route} onNavigate={navigate}>
      {loading ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center space-y-2">
          <p className="font-serif text-lg text-[#35261C]">
            Đang tải hồ sơ di sản tư liệu...
          </p>
        </div>
      ) : loadError ? (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
          <p className="font-serif text-xl font-bold text-[#782F35]">
            Không thể tải dữ liệu kho tư liệu
          </p>
          <p className="text-sm text-[#5C534A]">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadPublicCatalog();
            }}
            className="px-4 py-2 bg-[#35261C] text-[#F8F5EE] text-xs font-semibold rounded-md"
          >
            Thử lại
          </button>
        </div>
      ) : route.name === 'home' ? (
        <HomePage
          records={records}
          sources={sources}
          stats={stats}
          onNavigate={navigate}
        />
      ) : route.name === 'catalog' ? (
        <CatalogPage
          records={records}
          sources={sources}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onNavigate={navigate}
          initialQuery={initialQuery}
          initialTour={initialTour}
        />
      ) : route.name === 'detail' ? (
        <RecordDetailPage
          recordId={route.id}
          records={records}
          sources={sources}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onNavigate={navigate}
        />
      ) : route.name === 'timeline' ? (
        <TimelinePage
          records={records}
          sources={sources}
          onNavigate={navigate}
        />
      ) : route.name === 'gemini' ? (
        <GeminiAssistantPage records={records} />
      ) : route.name === 'sources' ? (
        <SourcesRightsPage sources={sources} records={records} />
      ) : route.name === 'about' ? (
        <AboutPage />
      ) : (
        <AdminPage
          publicRecords={records}
          sources={sources}
          onRefreshPublic={loadPublicCatalog}
          onNavigate={navigate}
        />
      )}
    </Layout>
  );
}
