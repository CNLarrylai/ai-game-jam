/* ============================================================
   home-canvas.jsx — 末日之家「活背景」（Claude Design 回流）
   源：design-handoff/incoming/末日-handoff（claude.ai/design 项目「末日」）
   画布 252×448（9:16），window.Room 引擎来自 design-home/room.js。
   load AFTER design-home/{pixel-lib,home-sprites,room}.js, BEFORE scenes-home.jsx
   产权：美术线（林子尧）
   ============================================================ */

function DesignHomeCanvas({ className, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current || !window.Room) return;
    const room = new window.Room(ref.current);
    let raf = 0, last = 0, dead = false;
    function loop(now) {
      if (dead) return;
      if (now - last >= 33) { last = now; try { room.render(now); } catch (e) {} }
      raf = requestAnimationFrame(loop);
    }
    try { room.render(performance.now()); } catch (e) {}
    raf = requestAnimationFrame(loop);
    const onVis = () => { if (!document.hidden) { last = 0; } };
    document.addEventListener("visibilitychange", onVis);
    return () => { dead = true; cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return <canvas ref={ref} className={className}
    style={{ display: "block", width: "100%", height: "100%",
      imageRendering: "pixelated", ...(style || {}) }} />;
}

Object.assign(window, { DesignHomeCanvas });
