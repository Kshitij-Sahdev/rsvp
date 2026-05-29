'use client';
import { FONTS, ORP_COLORS } from '@/lib/constants';

export default function SettingsDrawer({ prefs, setPref, onClose }) {
  if (!prefs) return null;

  const themes = ['dark', 'amoled', 'sepia', 'paper', 'graphite'];
  const orpKeys = Object.keys(ORP_COLORS);
  const focusModes = ['zen', 'guided', 'sentence'];
  const sounds = ['off', 'tick', 'ambient'];

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label="Settings">
        <div className="drawer-handle" aria-hidden="true">
          <div className="handle-bar" />
        </div>

        <div className="drawer-content">
          {/* Theme */}
          <section className="settings-section">
            <h3 className="section-title">Theme</h3>
            <div className="pill-group">
              {themes.map(t => (
                <button
                  key={t}
                  className={`pill ${prefs.theme === t ? 'active' : ''}`}
                  onClick={() => setPref('theme', t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {/* ORP Highlight */}
          <section className="settings-section">
            <h3 className="section-title">ORP Highlight</h3>
            <div className="swatch-group">
              {orpKeys.map(k => (
                <button
                  key={k}
                  className={`swatch ${prefs.orp === k ? 'active' : ''}`}
                  style={{ '--sw': ORP_COLORS[k].color }}
                  aria-label={k}
                  onClick={() => setPref('orp', k)}
                />
              ))}
            </div>
          </section>

          {/* Focus Mode */}
          <section className="settings-section">
            <h3 className="section-title">Focus Mode</h3>
            <div className="pill-group">
              {focusModes.map(m => (
                <button
                  key={m}
                  className={`pill ${prefs.focus === m ? 'active' : ''}`}
                  onClick={() => setPref('focus', m)}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section className="settings-section">
            <h3 className="section-title">Typography</h3>
            <div className="select-row">
              <label htmlFor="font-select">Font</label>
              <select
                id="font-select"
                className="settings-select"
                value={prefs.font}
                onChange={e => setPref('font', e.target.value)}
              >
                {FONTS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="slider-row">
              <label htmlFor="font-size">Size</label>
              <input
                type="range" id="font-size"
                min="20" max="80" value={prefs.fontSize}
                onChange={e => setPref('fontSize', Number(e.target.value))}
              />
              <span className="slider-val">{prefs.fontSize}px</span>
            </div>
            <div className="slider-row">
              <label htmlFor="font-weight">Weight</label>
              <input
                type="range" id="font-weight"
                min="300" max="700" step="100" value={prefs.fontWeight}
                onChange={e => setPref('fontWeight', Number(e.target.value))}
              />
              <span className="slider-val">{prefs.fontWeight}</span>
            </div>
            <div className="slider-row">
              <label htmlFor="letter-spacing">Spacing</label>
              <input
                type="range" id="letter-spacing"
                min="-2" max="10" step="0.5" value={prefs.letterSpacing}
                onChange={e => setPref('letterSpacing', Number(e.target.value))}
              />
              <span className="slider-val">{prefs.letterSpacing}px</span>
            </div>
            <div className="slider-row">
              <label htmlFor="context-opacity">Context</label>
              <input
                type="range" id="context-opacity"
                min="0" max="50" value={prefs.contextOpacity}
                onChange={e => setPref('contextOpacity', Number(e.target.value))}
              />
              <span className="slider-val">{(prefs.contextOpacity / 100).toFixed(2)}</span>
            </div>
          </section>

          {/* Sound */}
          <section className="settings-section">
            <h3 className="section-title">Sound</h3>
            <div className="pill-group">
              {sounds.map(s => (
                <button
                  key={s}
                  className={`pill ${prefs.sound === s ? 'active' : ''}`}
                  onClick={() => setPref('sound', s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {/* Accessibility */}
          <section className="settings-section">
            <h3 className="section-title">Accessibility</h3>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={prefs.dyslexia}
                onChange={e => setPref('dyslexia', e.target.checked)}
              />
              <span>Dyslexia-friendly font</span>
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={prefs.reduceMotion}
                onChange={e => setPref('reduceMotion', e.target.checked)}
              />
              <span>Reduced motion</span>
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={prefs.highContrast}
                onChange={e => setPref('highContrast', e.target.checked)}
              />
              <span>High contrast</span>
            </label>
          </section>
        </div>
      </div>
    </>
  );
}
