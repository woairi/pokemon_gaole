import { useState } from 'react';
import { sfx } from '../audio/sfx';
import { exportSave, importSave } from '../store/persistence';
import { useGame } from '../store/gameStore';

/** 저장 데이터 백업/복원 (코드 복사 & 붙여넣기) */
export function BackupModal({ onClose }: { onClose: () => void }) {
  const save = useGame((s) => s.save);
  const replaceSave = useGame((s) => s.replaceSave);
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  const exported = exportSave(save);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exported);
      setMsg('복사했어요! 메모장 등에 붙여넣어 보관하세요.');
    } catch {
      setMsg('복사가 안 되면 코드를 길게 눌러 직접 복사하세요.');
    }
  };

  const doImport = () => {
    const restored = importSave(code);
    if (!restored) {
      setMsg('코드가 올바르지 않아요. 다시 확인해 주세요.');
      return;
    }
    replaceSave(restored);
    sfx.fanfare();
    setMsg('복원 완료! 디스크가 돌아왔어요.');
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal__title">💾 데이터 백업</div>
        <div className="modal__tabs">
          <button
            type="button"
            className={tab === 'export' ? 'modal__tab modal__tab--on' : 'modal__tab'}
            onClick={() => { setTab('export'); setMsg(''); }}
          >
            내보내기
          </button>
          <button
            type="button"
            className={tab === 'import' ? 'modal__tab modal__tab--on' : 'modal__tab'}
            onClick={() => { setTab('import'); setMsg(''); }}
          >
            불러오기
          </button>
        </div>

        {tab === 'export' ? (
          <>
            <p className="modal__desc">
              이 코드를 복사해 두면 휴대폰을 바꾸거나 데이터가 지워져도 디스크를 되살릴 수 있어요.
            </p>
            <textarea className="modal__code" readOnly value={exported} rows={4} />
            <button type="button" className="big-btn modal__btn" onClick={copy}>
              코드 복사
            </button>
          </>
        ) : (
          <>
            <p className="modal__desc">백업해 둔 코드를 붙여넣고 불러오기를 누르세요.</p>
            <textarea
              className="modal__code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={4}
              placeholder="백업 코드 붙여넣기"
            />
            <button type="button" className="big-btn modal__btn" onClick={doImport}>
              불러오기
            </button>
          </>
        )}
        {msg && <div className="modal__msg">{msg}</div>}
        <button type="button" className="modal__close" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
