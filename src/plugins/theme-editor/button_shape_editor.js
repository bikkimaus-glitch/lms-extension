// Visual contour editor. Geometry is stored separately from handwritten CSS.
(() => {
  const api = window.cuLmsButtonShape;
  const key = 'customThemeButtonShape';
  const root = document.getElementById('button-shape-editor');
  if (!api || !root) return;
  let state = api.normalize({}),
    selected = 0,
    timer;
  root.innerHTML = `
    <h2>Форма кнопок</h2>
    <p class="muted">Меняйте скругления или рисуйте контур. Правки видны сразу во всех открытых вкладках LMS.</p>
    <div class="shape-fields">
      <label><input id="shape-enabled" type="checkbox"> Настраивать форму</label>
      <label>Вариант <select id="shape-preset"><option value="rounded">Скруглённая</option><option value="rectangle">Прямоугольник</option><option value="bevel">Скошенные углы</option><option value="parallelogram">Параллелограмм</option><option value="ticket">Билет</option><option value="custom">Свой контур</option></select></label>
      <label>Скругление <input id="shape-radius" type="range" min="0" max="64"><output id="shape-radius-value"></output></label>
      <label>Отступ по горизонтали <input id="shape-paddingX" type="range" min="4" max="48"><output id="shape-paddingX-value"></output></label>
      <label>Отступ по вертикали <input id="shape-paddingY" type="range" min="2" max="30"><output id="shape-paddingY-value"></output></label>
    </div>
    <div class="shape-preview"><button type="button" id="shape-demo">Открыть курс</button><button type="button" id="shape-demo-long">Кнопка с длинной надписью</button></div>
    <div id="shape-contour" hidden>
      <p class="muted">Перетаскивайте точки. Координаты можно также задать ползунками. Точки идут по краю по порядку; избегайте пересечения линий и оставляйте место для текста.</p>
      <svg id="shape-board" viewBox="-5 -5 110 110" role="img" aria-label="Редактор контура кнопки"><polygon id="shape-polygon"></polygon><g id="shape-handles"></g></svg>
      <div class="shape-fields"><label>Точка <select id="shape-point"></select></label><label>X, % <input id="shape-x" type="range" min="0" max="100"><output id="shape-x-value"></output></label><label>Y, % <input id="shape-y" type="range" min="0" max="100"><output id="shape-y-value"></output></label><button id="shape-add" type="button">Добавить точку</button><button id="shape-remove" type="button">Удалить точку</button></div>
    </div>
    <p id="shape-status" role="status" class="muted"></p>`;
  const $ = (id) => root.querySelector('#shape-' + id);
  function render() {
    $('enabled').checked = state.enabled;
    $('preset').value = state.custom ? 'custom' : 'rounded';
    ['radius', 'paddingX', 'paddingY'].forEach((k) => {
      $(k).value = state[k];
      $(k + '-value').value = state[k] + ' px';
    });
    $('contour').hidden = !state.custom;
    for (const id of ['demo', 'demo-long']) {
      const style = $(id).style;
      style.borderRadius = (state.custom ? 0 : state.radius) + 'px';
      style.clipPath = state.custom ? api.polygon(state) : 'none';
      style.padding = `${state.paddingY}px ${state.paddingX}px`;
    }
    selected = Math.min(selected, state.points.length - 1);
    $('point').replaceChildren(
      ...state.points.map((_, i) => new Option(String(i + 1), String(i), false, i === selected))
    );
    ['x', 'y'].forEach((k, i) => {
      $(k).value = state.points[selected][i];
      $(k + '-value').value = state.points[selected][i] + '%';
    });
    $('polygon').setAttribute('points', state.points.map((p) => p.join(',')).join(' '));
    $('handles').replaceChildren(
      ...state.points.map((p, i) => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', p[0]);
        c.setAttribute('cy', p[1]);
        c.setAttribute('r', i === selected ? '3' : '2');
        c.dataset.index = i;
        return c;
      })
    );
    $('add').disabled = state.points.length >= 16;
    $('remove').disabled = state.points.length <= 3;
  }
  function save() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await browser.storage.local.set({ [key]: api.normalize(state) });
        if (state.enabled) await browser.storage.sync.set({ customThemeToggle: true });
        $('status').textContent =
          'Сохранено. Контур обрезает выступающие края; проверьте короткие и длинные кнопки в LMS.';
      } catch {
        $('status').textContent = 'Не удалось сохранить форму. Попробуйте ещё раз.';
      }
    }, 150);
  }
  $('enabled').onchange = () => {
    state.enabled = $('enabled').checked;
    save();
  };
  $('preset').onchange = () => {
    const preset = $('preset').value;
    state.custom = preset !== 'rounded';
    if (api.PRESETS[preset]) state.points = api.PRESETS[preset].map((p) => [...p]);
    state.enabled = true;
    render();
    save();
  };
  ['radius', 'paddingX', 'paddingY'].forEach((k) => {
    $(k).oninput = () => {
      state[k] = Number($(k).value);
      state.enabled = true;
      render();
      save();
    };
  });
  $('point').onchange = () => {
    selected = Number($('point').value);
    render();
  };
  ['x', 'y'].forEach((k, i) => {
    $(k).oninput = () => {
      state.points[selected][i] = Number($(k).value);
      state.enabled = true;
      render();
      save();
    };
  });
  $('add').onclick = () => {
    const a = state.points[selected],
      b = state.points[(selected + 1) % state.points.length];
    state.points.splice(
      selected + 1,
      0,
      a.map((v, i) => Math.round((v + b[i]) / 2))
    );
    selected++;
    render();
    save();
  };
  $('remove').onclick = () => {
    state.points.splice(selected, 1);
    render();
    save();
  };
  let dragging = false;
  $('board').onpointerdown = (e) => {
    const idx = e.target.dataset.index;
    if (idx === undefined) return;
    selected = Number(idx);
    dragging = true;
    $('board').setPointerCapture(e.pointerId);
    render();
  };
  $('board').onpointermove = (e) => {
    if (!dragging) return;
    const p = $('board').createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const local = p.matrixTransform($('board').getScreenCTM().inverse());
    state.points[selected] = [local.x, local.y].map((v) =>
      Math.max(0, Math.min(100, Math.round(v)))
    );
    state.enabled = true;
    render();
    save();
  };
  $('board').onpointerup = $('board').onpointercancel = () => {
    dragging = false;
  };
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && key in changes) {
      state = api.normalize(changes[key].newValue);
      render();
    }
  });
  browser.storage.local.get(key).then((data) => {
    state = api.normalize(data[key]);
    render();
  });
})();
