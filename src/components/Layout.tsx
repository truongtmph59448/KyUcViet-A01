import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export type AppRoute =
  | { name: 'home' }
  | { name: 'catalog' }
  | { name: 'detail'; id: string }
  | { name: 'timeline' }
  | { name: 'gemini' }
  | { name: 'sources' }
  | { name: 'about' }
  | { name: 'admin' };

interface LayoutProps {
  route: AppRoute;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Kho tư liệu', path: '/kho-tu-lieu', routeName: 'catalog' },
  { label: 'Dòng thời gian', path: '/dong-thoi-gian', routeName: 'timeline' },
  { label: 'Trợ lý Gemini', path: '/tro-ly-gemini', routeName: 'gemini' },
  { label: 'Nguồn & Quyền', path: '/nguon-va-quyen', routeName: 'sources' },
  { label: 'Giới thiệu', path: '/gioi-thieu', routeName: 'about' },
] as const;

export function Layout({ route, onNavigate, children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
    path: string
  ) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5EE] text-[#292524]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#35261C] focus:text-[#F8F5EE] focus:rounded"
      >
        Chuyển tới nội dung chính
      </a>

      <header className="sticky top-0 z-40 bg-[#F8F5EE]/95 backdrop-blur-sm border-b border-[#E2DACB]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#35261C] whitespace-nowrap shrink-0"
          >
            Ký Ức Việt
          </a>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#5C534A]"
          >
            {NAV_ITEMS.map((item) => {
              const active =
                route.name === item.routeName ||
                (item.routeName === 'catalog' && route.name === 'detail');
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => handleLinkClick(e, item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    active
                      ? 'text-[#782F35] border-[#782F35]'
                      : 'border-transparent hover:text-[#35261C] hover:border-[#B39359]/60'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA button + mobile menu trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/quan-ly"
              onClick={(e) => handleLinkClick(e, '/quan-ly')}
              className={`hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                route.name === 'admin'
                  ? 'bg-[#782F35] text-[#F8F5EE]'
                  : 'bg-[#35261C] text-[#F8F5EE] hover:bg-[#782F35]'
              }`}
            >
              Quản lý
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-md text-[#35261C] hover:bg-[#E2DACB]/50"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Điều hướng di động"
            className="lg:hidden border-t border-[#E2DACB] bg-[#F8F5EE] px-4 py-4 space-y-2"
          >
            {NAV_ITEMS.map((item) => {
              const active = route.name === item.routeName;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => handleLinkClick(e, item.path)}
                  className={`block px-3 py-2.5 rounded-md text-sm font-medium ${
                    active
                      ? 'bg-[#782F35]/10 text-[#782F35]'
                      : 'text-[#292524] hover:bg-[#E2DACB]/40'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <a
              href="/quan-ly"
              onClick={(e) => handleLinkClick(e, '/quan-ly')}
              className="block px-3 py-2.5 rounded-md text-sm font-semibold bg-[#35261C] text-[#F8F5EE] text-center mt-2"
            >
              Quản lý nội bộ
            </a>
          </nav>
        )}
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-[#E2DACB] bg-[#F3EFE6] mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-2">
            <p className="font-serif text-base font-bold text-[#35261C]">
              Ký Ức Việt – Hồ sơ số di sản tư liệu
            </p>
            <p className="text-xs text-[#5C534A] leading-relaxed">
              Dự án xã hội phi lợi nhuận (Mã A01) — Không bán hàng, không thu phí,
              không quảng cáo. Phục vụ học tập, tra cứu và bảo tồn di sản tư liệu
              Việt Nam.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-[#35261C] text-xs uppercase tracking-wider">
              Thông tin thực hiện
            </p>
            <p className="text-xs text-[#5C534A] leading-relaxed">
              Sinh viên: Trần Mạnh Trường (PH59448 – Nhóm 1)
              <br />
              Chương trình Thực tập sinh Đợt 15 — FPT Polytechnic × IMTA TECH
              <br />
              Kế hoạch tuần 4 (Mốc 05/11/2026)
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-[#35261C] text-xs uppercase tracking-wider">
              Liên kết chuyên mục
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#782F35]">
              <a
                href="/kho-tu-lieu"
                onClick={(e) => handleLinkClick(e, '/kho-tu-lieu')}
                className="hover:underline"
              >
                Kho tư liệu
              </a>
              <a
                href="/dong-thoi-gian"
                onClick={(e) => handleLinkClick(e, '/dong-thoi-gian')}
                className="hover:underline"
              >
                Dòng thời gian
              </a>
              <a
                href="/tro-ly-gemini"
                onClick={(e) => handleLinkClick(e, '/tro-ly-gemini')}
                className="hover:underline"
              >
                Trợ lý Gemini
              </a>
              <a
                href="/nguon-va-quyen"
                onClick={(e) => handleLinkClick(e, '/nguon-va-quyen')}
                className="hover:underline"
              >
                Nguồn &amp; Quyền
              </a>
              <a
                href="/gioi-thieu"
                onClick={(e) => handleLinkClick(e, '/gioi-thieu')}
                className="hover:underline"
              >
                Giới thiệu
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
