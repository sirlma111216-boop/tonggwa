import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { findUnitInManifest, loadManifest } from '../../content/loader';
import type { Manifest } from '../../content/types';
import { useAuthUser } from '../../services/auth';
import { unitSummary, useProgress } from '../../services/progress/store';

const STAGE_LABEL: Record<string, string> = {
  prerequisite: '선개념', concept: '개념', concept_check: '개념평가', advanced: '심화개념', advanced_check: '심화평가', strategy: '수능대비 전략', exam_check: '수능대비평가',
};

export function StartPage() {
  const user = useAuthUser();
  const state = useProgress();
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  useEffect(() => {
    loadManifest().then(setManifest);
  }, []);

  const last = state?.lastPosition;
  const lastUnit = manifest && last ? findUnitInManifest(manifest, last.unitId) : null;
  const stageKeys = manifest?.stageOrder.map((s) => s.key) ?? [];
  const unitsStarted = state ? Object.keys(state.units).length : 0;
  const unitsDone = state && manifest ? Object.entries(state.units).filter(([, u]) => unitSummary(u, stageKeys).status === 'done').length : 0;

  return (
    <div className="page page-narrow">
      <div className="start-hero">
        <section className="card">
          <p className="muted" style={{ margin: 0 }}>안녕하세요, {user?.displayName}.</p>
          <h1 style={{ marginTop: 6 }}>
            {lastUnit ? <>이어서: {lastUnit.unit.title}</> : '선개념부터 시작해 볼까요?'}
          </h1>
          {lastUnit && last && (
            <p className="muted" style={{ margin: 0 }}>
              {lastUnit.chapter.title} · {STAGE_LABEL[last.stageKey]} 단계에서 멈췄어요.
            </p>
          )}
          <div className="start-actions">
            <button className="btn btn-primary" onClick={() => navigate('/start/semester')}>
              처음으로 학습하기
              <small>학기와 단원을 골라 선개념부터 시작해요</small>
            </button>
            <button
              className="btn"
              disabled={!last}
              onClick={() => last && navigate(`/learn/${last.unitId}/${last.stageKey}`)}
            >
              학습 이어서 하기
              <small>{last ? '마지막으로 보던 단계로 바로 가요' : '아직 이어서 할 학습이 없어요'}</small>
            </button>
          </div>
        </section>
        <div className="start-image" aria-hidden="true">
          <img src="/images/home-science-studio.png" alt="" />
        </div>
      </div>

      <div className="grid-3" style={{ marginTop: 22 }}>
        <section className="card">
          <h3>이번 학습의 구조</h3>
          <p className="small muted" style={{ margin: 0 }}>
            모든 단원은 <strong>선개념 → 개념 → 개념평가 → 심화개념 → 심화평가 → 수능대비 전략 → 수능대비평가</strong>의 일곱 단계로 이어져요. 평가는 제출한 뒤에만 정답과 해설이 열려요.
          </p>
        </section>
        <section className="card">
          <h3>지금까지의 실제 기록</h3>
          {unitsStarted === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>아직 시작한 단원이 없어요. 첫 단원을 열면 여기에 진행 상황이 쌓여요.</p>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              시작한 단원 {unitsStarted}개 · 일곱 단계를 모두 마친 단원 {unitsDone}개 · 전체 {manifest?.stats.units ?? '-'}개 단원
            </p>
          )}
          <p style={{ marginTop: 10, marginBottom: 0 }}>
            <Link to="/record">내 학습 기록 보기</Link>
          </p>
        </section>
        <section className="card">
          <h3>더 둘러보기</h3>
          <p className="small muted" style={{ margin: 0 }}>
            <Link to="/start/units/1">1학기 단원 전체</Link> · <Link to="/start/units/2">2학기 단원 전체</Link>
            <br />
            <Link to="/exams">평가원 공식 예시 37문항</Link> (원문을 먼저 풀고 해설을 열어요)
          </p>
        </section>
      </div>

      {manifest && (
        <p className="small muted" style={{ marginTop: 18 }}>
          교재 검토본 {manifest.contentVersion} ({manifest.sourceDate}) · 성취기준 {manifest.stats.standards}개 · 학습 묶음 {manifest.stats.units}개 · 자작·재구성 문항 {manifest.stats.questions}개 · 평가원 공식 예시 {manifest.stats.kiceQuestions}문항
        </p>
      )}
    </div>
  );
}
