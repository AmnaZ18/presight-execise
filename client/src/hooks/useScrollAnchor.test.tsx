import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useScrollAnchor } from "./useScrollAnchor";

function Harness({ tick, showRow = true, busy = false }: { tick: number; showRow?: boolean; busy?: boolean }) {
  const anchor = useScrollAnchor(busy);
  return (
    <div data-testid="scroller" {...anchor}>
      <section>
        <h3 data-testid="heading">Hobbies</h3>
        <button type="button" data-testid="more">
          Show all
        </button>
        <p data-testid="plain">Some text</p>
        {showRow && (
          <label data-testid="row">
            <input type="checkbox" aria-label="Chess" /> Chess
          </label>
        )}
      </section>
      <span hidden>{tick}</span>
    </div>
  );
}

const SCROLLER_TOP = 100;

function setup({ scrollTop = 300, rowTop = 400, headingTop = 150, buttonTop = 250 } = {}) {
  const view = render(<Harness tick={0} />);
  const scroller = screen.getByTestId("scroller");
  const tops = { row: rowTop, heading: headingTop, button: buttonTop };

  let currentScrollTop = scrollTop;
  Object.defineProperty(scroller, "scrollTop", {
    configurable: true,
    get: () => currentScrollTop,
    set: (value: number) => {
      currentScrollTop = value;
    },
  });
  scroller.getBoundingClientRect = () => ({ top: SCROLLER_TOP }) as DOMRect;
  screen.getByTestId("row").getBoundingClientRect = () => ({ top: tops.row }) as DOMRect;
  screen.getByTestId("heading").getBoundingClientRect = () => ({ top: tops.heading }) as DOMRect;
  screen.getByTestId("more").getBoundingClientRect = () => ({ top: tops.button }) as DOMRect;

  return {
    scroller,
    tops,
    scrollTop: () => currentScrollTop,
    setScrollTop: (value: number) => {
      currentScrollTop = value;
    },

    rerender: (props: { showRow?: boolean; busy?: boolean } = {}) =>
      view.rerender(<Harness tick={Math.random()} busy={props.busy ?? true} showRow={props.showRow} />),
    tapRow: () => fireEvent.click(screen.getByRole("checkbox", { name: "Chess" })),
  };
}

describe("useScrollAnchor", () => {
  it("does nothing until the user has clicked something", () => {
    const t = setup();
    t.tops.row = 700;
    t.rerender();
    expect(t.scrollTop()).toBe(300);
  });

  it("scrolls by exactly how far the clicked row moved, keeping it in the same place on screen", () => {
    const t = setup({ scrollTop: 300, rowTop: 400 });
    t.tapRow();

    t.tops.row = 250;
    t.rerender();
    expect(t.scrollTop()).toBe(150);
  });

  it("scrolls the other way when the row moves down (a label appears above it)", () => {
    const t = setup({ scrollTop: 300, rowTop: 400 });
    t.tapRow();

    t.tops.row = 418;
    t.rerender();
    expect(t.scrollTop()).toBe(318);
  });

  it("leaves the scroll position alone when the row did not move", () => {
    const t = setup();
    t.tapRow();
    t.rerender();
    expect(t.scrollTop()).toBe(300);
  });

  it("ignores a shift of under half a pixel", () => {
    const t = setup();
    t.tapRow();
    t.tops.row = 400.3;
    t.rerender();
    expect(t.scrollTop()).toBe(300);
  });

  it("keeps correcting on later changes too, as lists shrink one tick after another", () => {
    const t = setup({ scrollTop: 900, rowTop: 400 });
    t.tapRow();

    t.tops.row = 300;
    t.rerender();
    expect(t.scrollTop()).toBe(800);

    t.tops.row = 340;
    t.rerender();
    expect(t.scrollTop()).toBe(740);
  });

  it("follows the user's own scrolling instead of fighting it", () => {
    const t = setup({ scrollTop: 300, rowTop: 400 });
    t.tapRow();

    t.setScrollTop(380);
    t.tops.row = 320;
    fireEvent.scroll(t.scroller);

    t.tops.row = 340;
    t.rerender();
    expect(t.scrollTop()).toBe(400);
  });

  it("holds the section heading still if the clicked row has left the list", () => {
    const t = setup({ scrollTop: 300, rowTop: 400, headingTop: 150 });
    t.tapRow();

    t.tops.heading = 120;
    t.rerender({ showRow: false });
    expect(t.scrollTop()).toBe(270);
  });

  it("does nothing if both the row and its heading are gone", () => {
    const t = setup();
    t.tapRow();
    screen.getByTestId("heading").remove();
    t.rerender({ showRow: false });
    expect(t.scrollTop()).toBe(300);
  });

  it("makes a last correction when the lists arrive, then lets go", () => {
    const t = setup({ scrollTop: 900, rowTop: 400 });
    t.tapRow();

    t.tops.row = 300;
    t.rerender();
    expect(t.scrollTop()).toBe(800);

    t.tops.row = 340;
    t.rerender({ busy: false });
    expect(t.scrollTop()).toBe(740);

    t.tops.row = 100;
    t.rerender({ busy: false });
    expect(t.scrollTop()).toBe(740);
  });

  it("corrects the first render after a click even if nothing is being fetched, then lets go", () => {
    const t = setup({ scrollTop: 300, rowTop: 400 });
    t.tapRow();

    t.tops.row = 418;
    t.rerender({ busy: false });
    expect(t.scrollTop()).toBe(318);

    t.tops.row = 100;
    t.rerender({ busy: false });
    expect(t.scrollTop()).toBe(318);
  });

  it("does not act on an old click when something unrelated re-renders much later", () => {
    const t = setup({ scrollTop: 300, rowTop: 400 });
    t.tapRow();
    t.rerender({ busy: false });
    t.rerender({ busy: false });

    t.tops.row = 800;
    t.rerender({ busy: false });
    expect(t.scrollTop()).toBe(300);
  });

  it("ignores buttons: 'Show all' opens rows you want to see, so it must not scroll them away", () => {
    const t = setup({ scrollTop: 300, buttonTop: 250 });
    fireEvent.click(screen.getByTestId("more"));

    t.tops.button = 650;
    t.rerender();
    expect(t.scrollTop()).toBe(300);
  });

  it("a click on a button does not replace the checkbox row being held still", () => {
    const t = setup({ scrollTop: 300, rowTop: 400 });
    t.tapRow();
    fireEvent.click(screen.getByTestId("more"));

    t.tops.row = 250;
    t.rerender();
    expect(t.scrollTop()).toBe(150);
  });

  it("is not thrown off by a click on plain text", () => {
    const t = setup({ scrollTop: 300, rowTop: 400 });
    t.tapRow();
    fireEvent.click(screen.getByTestId("plain"));

    t.tops.row = 250;
    t.rerender();
    expect(t.scrollTop()).toBe(150);
  });
});
