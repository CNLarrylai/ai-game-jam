/* ===== avatar-app.jsx — interactive generator UI ===== */
const { useState: useStateG } = React;

function ChipRow({ label, options, value, onChange, render }) {
  return (
    <div className="ctrl">
      <div className="ctrl-label">{label}</div>
      <div className="chips">
        {options.map(o => (
          <button key={o.v} className={`chip ${value === o.v ? 'on' : ''}`} onClick={() => onChange(o.v)} title={o.t || o.label}>
            {render ? render(o) : (o.label || o.v)}
          </button>
        ))}
      </div>
    </div>
  );
}

function GenApp() {
  const [r, setR] = useStateG(() => ({
    id: 'main', lit: true, body: 'mid', skin: 'tan', hair: 'short', hairColor: 'black',
    accessory: 'glasses', facial: 'none', emblem: 'none', role: 'none', suspense: false,
  }));
  const [audience, setAudience] = useStateG(() => [
    randomAvatar('donor'), randomAvatar('mic'), randomAvatar('active'),
    randomAvatar('none'), randomAvatar('none'), randomAvatar('active'),
  ]);
  const set = (k, v) => setR(p => ({ ...p, [k]: v }));
  const role = ROLE[r.role];
  const reroll = () => setR(p => ({ ...randomAvatar(p.role), id: 'main', lit: p.lit, role: p.role }));
  const refreshAudience = () => setAudience([
    randomAvatar('donor'), randomAvatar('mic'), randomAvatar('active'),
    randomAvatar('none'), randomAvatar('none'), randomAvatar('active'),
  ]);

  const skinOpts = Object.keys(SKIN).map(k => ({ v: k, label: SKIN[k].label, col: SKIN[k].b }));
  const hairColOpts = Object.keys(HAIRCOL).map(k => ({ v: k, label: HAIRCOL_LABEL[k], col: HAIRCOL[k] }));

  return (
    <div id="gen">
      <AvatarDefs />
      <div className="gen-hero">
        <div className="eyebrow">CHARACTER GENERATOR · AUDIENCE → IN-GAME</div>
        <h1>角色生成器</h1>
        <p>同一套版画语言,刻意留出灵活轴:从末日的<b>匿名剪影</b>,一路调到能认出是谁的<b>写实头像</b>。观众没传照片也没关系 —— 一键生成通用角色,让他们"入场"。</p>
      </div>

      <div className="gen-main">
        {/* preview */}
        <div className="preview-col">
          <div className={`preview ${r.role !== 'none' ? 'has-role' : ''}`} style={{ '--ring': role.ring }}>
            <Avatar recipe={{ ...r, roleTint: role.tint }} size={200} />
            {r.role !== 'none' && <div className="role-badge" style={{ background: role.ring }}>{role.badge}</div>}
          </div>
          <div className="preview-meta">
            <div className="pm-role" style={{ color: r.role !== 'none' ? role.ring : 'var(--fog-dim)' }}>{role.badge} {role.label}</div>
            <div className="pm-recipe">{BODY_LABEL[r.body]} · {r.lit ? SKIN[r.skin].label + '肤' : '剪影'} · {HAIR_LABEL[r.hair]} · {ACC_LABEL[r.accessory]}</div>
          </div>
          <div className="preview-actions">
            <button className="g-btn" onClick={reroll}>🎲 随机</button>
            <button className={`g-btn toggle ${r.lit ? 'on' : ''}`} onClick={() => set('lit', !r.lit)}>{r.lit ? '◐ 写实' : '● 剪影'}</button>
          </div>
        </div>

        {/* controls */}
        <div className="controls">
          <div className="style-axis">
            <div className="sa-label">风格轴 · 刻意的灵活度</div>
            <div className="sa-track">
              <button className={`sa-end ${!r.lit ? 'on' : ''}`} onClick={() => set('lit', false)}>剪影<span>末日 · 匿名 · 未知</span></button>
              <div className="sa-line"></div>
              <button className={`sa-end ${r.lit ? 'on' : ''}`} onClick={() => set('lit', true)}>写实<span>观众 · 个人 · 入场</span></button>
            </div>
          </div>

          <ChipRow label="体型" options={BODY.map(v => ({ v, label: BODY_LABEL[v] }))} value={r.body} onChange={v => set('body', v)} />
          <ChipRow label="肤色" options={skinOpts} value={r.skin} onChange={v => set('skin', v)}
            render={o => <span className="sw" style={{ background: o.col }}></span>} />
          <ChipRow label="发型" options={HAIR.map(v => ({ v, label: HAIR_LABEL[v] }))} value={r.hair} onChange={v => set('hair', v)} />
          <ChipRow label="发色" options={hairColOpts} value={r.hairColor} onChange={v => set('hairColor', v)}
            render={o => <span className="sw" style={{ background: o.col }}></span>} />
          <ChipRow label="配饰" options={ACCESSORY.map(v => ({ v, label: ACC_LABEL[v] }))} value={r.accessory} onChange={v => set('accessory', v)} />
          <ChipRow label="胡须" options={FACIAL.map(v => ({ v, label: FACIAL_LABEL[v] }))} value={r.facial} onChange={v => set('facial', v)} />
          <ChipRow label="阵营点睛" options={EMBLEM.map(v => ({ v, label: EMB_LABEL[v] }))} value={r.emblem} onChange={v => set('emblem', v)} />
          <ChipRow label="直播身份" options={Object.keys(ROLE).map(v => ({ v, label: ROLE[v].label }))} value={r.role} onChange={v => set('role', v)} />
          <ChipRow label="悬念标记" options={[{ v: false, label: '无' }, { v: true, label: '病变绿斑' }]} value={r.suspense} onChange={v => set('suspense', v)} />
        </div>
      </div>

      {/* audience-as-characters */}
      <div className="audience-sec">
        <div className="aud-head">
          <div>
            <div className="ah-t">观众入场 · 直播间 → 游戏角色</div>
            <div className="ah-d">没传头像的观众,按身份一键生成通用角色。金主戴冠、上麦持麦、活跃评论带框 —— 仿佛他们真的参与进了这一局。</div>
          </div>
          <button className="g-btn" onClick={refreshAudience}>↻ 换一批观众</button>
        </div>
        <div className="aud-grid">
          {audience.map((a, i) => {
            const rl = ROLE[a.role];
            return (
              <div key={a.id} className={`aud-cell ${a.role !== 'none' ? 'has-role' : ''}`} style={{ '--ring': rl.ring }}>
                <div className="aud-av"><Avatar recipe={{ ...a, roleTint: rl.tint }} size={92} /></div>
                {a.role !== 'none' && <div className="aud-badge" style={{ background: rl.ring }}>{rl.badge}</div>}
                <div className="aud-role" style={{ color: a.role !== 'none' ? rl.ring : 'var(--fog-dim)' }}>{rl.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="gen-foot">同一套配方,既能产出末日匿名幸存者,也能把直播间任何一位观众变成认得出的角色。<br />灵活轴 + 更多可提炼特征 = 一套美术系统,服务多种题材与互动玩法。</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<GenApp />);
