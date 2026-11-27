import { useCallback, useEffect, useMemo, useState } from 'react';
import tulieuRaw from '../data/tulieu.json';
import sourcesRaw from '../data/sources.json';
import { Layout, type AppRoute } from './components/Layout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { RecordDetailPage } from './pages/RecordDetailPage.tsx';
import { TimelinePage } from './pages/TimelinePage.tsx';
import { GeminiAssistantPage } from './pages/GeminiAssistantPage.tsx';
import { SourcesRightsPage } from './pages/SourcesRightsPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import type { HeritageRecord, SourceRecord } from './types.ts';
import { computeCatalogStats, sanitizePublicRecord } from './utils/catalog.ts';

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
  return { name: 'home' };
}

export default function App() {
  const [currentUrl, setCurrentUrl] = useState(
    () => window.location.pathname + window.location.search
  );

  // Load approved public records and sources directly from static bundled JSON
  const records = useMemo<HeritageRecord[]>(() => {
    return (tulieuRaw as HeritageRecord[])
      .filter((r) => r.publication_status === 'Được công bố')
      .map(sanitizePublicRecord);
  }, []);

  const sources = useMemo<SourceRecord[]>(() => {
    return sourcesRaw as SourceRecord[];
  }, []);

  const stats = useMemo(() => computeCatalogStats(records), [records]);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

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

  const urlObj = new URL(currentUrl, window.location.origin);
  const route = parseRoute(urlObj.pathname);
  const initialQuery = urlObj.searchParams.get('q') || '';
  const initialTour = urlObj.searchParams.get('tour') === '1';

  return (
    <Layout route={route} onNavigate={navigate}>
      {route.name === 'home' ? (
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
      ) : (
        <AboutPage />
      )}
    </Layout>
  );
}
