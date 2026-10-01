/** Control instructions shown in the main menu. */
export function ControlsHelp() {
  return (
    <section className="controls-help" aria-labelledby="controls-title">
      <h2 id="controls-title">Navigate the islands. Survive the battle.</h2>
      <dl>
        <div>
          <dt>W / ↑</dt>
          <dd>Sail forward</dd>
        </div>
        <div>
          <dt>A D / ← →</dt>
          <dd>Turn</dd>
        </div>
        <div>
          <dt>Space</dt>
          <dd>Front cannon</dd>
        </div>
        <div>
          <dt>Q / E</dt>
          <dd>Left / right broadside</dd>
        </div>
        <div>
          <dt>P / Esc</dt>
          <dd>Pause</dd>
        </div>
      </dl>
      <p>On touch screens, use the buttons at the bottom corners.</p>
    </section>
  )
}
