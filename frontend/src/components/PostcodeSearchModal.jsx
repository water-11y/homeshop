import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { embedPostcodeSearch } from '../utils/postcode.js';

export default function PostcodeSearchModal({ open, onClose, onComplete }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !containerRef.current) {
      return;
    }

    let mounted = true;
    setError('');

    embedPostcodeSearch(containerRef.current, (address) => {
      if (!mounted) {
        return;
      }

      onComplete(address);
      onClose();
    }).catch(() => {
      if (mounted) {
        setError('주소 검색 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      }
    });

    return () => {
      mounted = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [open, onClose, onComplete]);

  if (!open) {
    return null;
  }

  return (
    <div className="postcode-modal" role="dialog" aria-modal="true" aria-label="우편번호 검색">
      <div className="postcode-backdrop" onClick={onClose} />
      <section className="postcode-panel">
        <div className="postcode-panel-head">
          <div>
            <p className="eyebrow dark">Kakao Postcode</p>
            <h2>주소 검색</h2>
          </div>
          <button className="icon-only" type="button" onClick={onClose} aria-label="주소 검색 닫기">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="postcode-help">
          도로명, 건물명, 지번을 검색하고 결과를 선택하면 우편번호와 기본 주소가 자동 입력됩니다.
        </p>
        {error ? (
          <p className="error">{error}</p>
        ) : (
          <div className="postcode-embed-shell">
            <div className="postcode-loading">
              <Search size={18} aria-hidden="true" />
              주소 검색창을 불러오는 중...
            </div>
            <div className="postcode-embed" ref={containerRef} />
          </div>
        )}
      </section>
    </div>
  );
}
