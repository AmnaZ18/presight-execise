import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigationType } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FacetCount, User, UsersPage } from "./api/types";
import App from "./App";
import { PAGE_SIZE } from "./hooks/queries";

const DEFAULT_USER_COUNT = 45;
const ALL_USERS: User[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  avatar: "purple",
  first_name: `First${String(i + 1).padStart(2, "0")}`,
  last_name: `Last${String(i + 1).padStart(2, "0")}`,
  age: 20 + (i % 40),
  nationality: "Brazil",
  hobbies: ["Hiking", "Yoga", "Chess"],
}));

const NATIONALITIES: FacetCount[] = [
  { value: "Brazil", count: 30 },
  { value: "Japan", count: 20 },
];
const HOBBIES: FacetCount[] = [
  { value: "Hiking", count: 40 },
  { value: "Yoga", count: 25 },
];

interface FakeApiOptions {
  userCount?: number;

  total?: (url: URL) => number;

  failUsers?: number;
}

function installFakeApi(options: FakeApiOptions = {}) {
  let usersFailuresLeft = options.failUsers ?? 0;

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

    if (url.pathname === "/api/users") {
      if (usersFailuresLeft > 0) {
        usersFailuresLeft--;
        return new Response("boom", { status: 500 });
      }
      const page = Number(url.searchParams.get("page"));
      const pageSize = Number(url.searchParams.get("pageSize"));
      const selected = url.searchParams.getAll("nationality").length + url.searchParams.getAll("hobby").length;
      const total = options.total
        ? options.total(url)
        : Math.max(0, (options.userCount ?? DEFAULT_USER_COUNT) - 10 * selected);
      const start = (page - 1) * pageSize;
      const body: UsersPage = {
        users: ALL_USERS.slice(start, Math.min(start + pageSize, total)),
        page,
        pageSize,
        total,
        hasMore: start + pageSize < total,
      };
      return json(body);
    }
    if (url.pathname === "/api/nationalities/top") return json({ nationalities: NATIONALITIES });
    if (url.pathname === "/api/hobbies/top") return json({ hobbies: HOBBIES });
    return new Response("not found", { status: 404 });
  });

  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function userRequests(fetchMock: ReturnType<typeof installFakeApi>) {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input), "http://localhost"))
    .filter((url) => url.pathname === "/api/users")
    .map((url) => url.searchParams);
}

function LocationProbe() {
  return (
    <>
      <output data-testid="location">{useLocation().search}</output>
      <output data-testid="navigation-type">{useNavigationType()}</output>
    </>
  );
}

function renderApp(initialUrl = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const currentSearch = () => screen.getByTestId("location").textContent;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  installFakeApi();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("loading and showing results", () => {
  it("shows the loading skeleton first, then the users, with the total and loaded count", async () => {
    renderApp();
    expect(screen.getByRole("status", { name: "Loading users" })).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "First01 Last01" })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading users" })).not.toBeInTheDocument();
    
    expect(screen.getByRole("heading", { level: 2, name: "45 users" })).toBeInTheDocument();
    
    expect(await screen.findByText(/Showing 45 of 45/)).toHaveTextContent("Showing 45 of 45 · sorted by first name, A–Z");
  });

  it("fetches a single page on load when the results fit in one", async () => {
    const fetchMock = installFakeApi();
    renderApp();
    await screen.findByText(/Showing 45 of 45/);

    expect(PAGE_SIZE).toBeGreaterThanOrEqual(45);
    expect(userRequests(fetchMock).map((p) => p.get("page"))).toEqual(["1"]);
  });

  it("does not fetch page 2 on load just because page 1 filled the screen", async () => {
    const fetchMock = installFakeApi({ userCount: PAGE_SIZE + 15 });
    renderApp();
    await screen.findByText(new RegExp(`Showing ${PAGE_SIZE} of ${PAGE_SIZE + 15}`));

    expect(userRequests(fetchMock).map((p) => p.get("page"))).toEqual(["1"]);
  });

  it("loads the next page as you scroll near the end of what's loaded", async () => {
    const total = PAGE_SIZE + 15;
    const fetchMock = installFakeApi({ userCount: total });
    renderApp();
    await screen.findByText(new RegExp(`Showing ${PAGE_SIZE} of ${total}`));

   
    const results = screen.getByRole("region", { name: "Search results" });
    Object.defineProperty(results, "scrollTop", { configurable: true, writable: true, value: 100000 });
    fireEvent.scroll(results);

    expect(await screen.findByText(new RegExp(`Showing ${total} of ${total}`))).toBeInTheDocument();
    expect(userRequests(fetchMock).map((p) => p.get("page"))).toEqual(["1", "2"]);
  });

  it("asks the API for page 1 of the default sort", async () => {
    const fetchMock = installFakeApi();
    renderApp();
    await screen.findByRole("heading", { name: "First01 Last01" });

    const [first] = userRequests(fetchMock);
    expect(first.get("page")).toBe("1");
    expect(first.get("pageSize")).toBe(String(PAGE_SIZE));
    expect(first.get("sort")).toBe("first_name");
    expect(first.get("dir")).toBe("asc");
  });

  it("fills both sidebar lists from the facet endpoints", async () => {
    renderApp();
    const sidebar = await screen.findByRole("complementary", { name: "Filters" });
    expect(await within(sidebar).findByRole("checkbox", { name: /Brazil/ })).toBeInTheDocument();
    expect(within(sidebar).getByRole("checkbox", { name: /Hiking/ })).toBeInTheDocument();
  });
});

describe("URL-synced state", () => {
  it("restores the whole view from the URL: filters, sort, and what it asks the API for", async () => {
    const fetchMock = installFakeApi();
    renderApp("/?search=an&nationality=Brazil&nationality=Japan&hobby=Hiking&sort=age&dir=desc");

    await screen.findByRole("heading", { name: "First01 Last01" });

    // The request carries exactly what the URL said...
    const [request] = userRequests(fetchMock);
    expect(request.get("search")).toBe("an");
    expect(request.getAll("nationality")).toEqual(["Brazil", "Japan"]);
    expect(request.getAll("hobby")).toEqual(["Hiking"]);
    expect(request.get("sort")).toBe("age");
    expect(request.get("dir")).toBe("desc");

    // ...and the controls show it.
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("searchbox")).toHaveValue("an");
    expect(within(banner).getByRole("combobox", { name: "Sort by" })).toHaveTextContent("Age");
    expect(within(banner).getByRole("button", { name: /Sort direction: High–Low/ })).toBeInTheDocument();

    const chips = within(screen.getByRole("group", { name: "Active filters" }));
    expect(chips.getByRole("button", { name: "Remove filter: Name contains “an”" })).toBeInTheDocument();
    expect(chips.getByRole("button", { name: "Remove filter: Nationality Brazil" })).toBeInTheDocument();
    expect(chips.getByRole("button", { name: "Remove filter: Nationality Japan" })).toBeInTheDocument();
    expect(chips.getByRole("button", { name: "Remove filter: Hobby Hiking" })).toBeInTheDocument();
  });

  it("ticking a sidebar filter writes it to the URL and refreshes the list AND both facet lists", async () => {
    const user = userEvent.setup();
    const fetchMock = installFakeApi();
    renderApp();
    const sidebar = await screen.findByRole("complementary", { name: "Filters" });
    await screen.findByRole("heading", { name: "First01 Last01" });
    fetchMock.mockClear();

    await user.click(await within(sidebar).findByRole("checkbox", { name: /Japan/ }));

    expect(currentSearch()).toBe("?nationality=Japan");
    await waitFor(() => {
      const paths = fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
      const withFilter = (path: string) =>
        paths.some((u) => u.pathname === path && u.searchParams.getAll("nationality").includes("Japan"));
      expect(withFilter("/api/users")).toBe(true);
      expect(withFilter("/api/hobbies/top")).toBe(true);
      expect(withFilter("/api/nationalities/top")).toBe(true);
    });
  });

  it("changing the sort writes it to the URL and goes back to page 1 in the new order", async () => {
    const user = userEvent.setup();
    const fetchMock = installFakeApi();
    renderApp();
    await screen.findByRole("heading", { name: "First01 Last01" });
    fetchMock.mockClear();

    const banner = within(screen.getByRole("banner"));
    await user.click(banner.getByRole("combobox", { name: "Sort by" }));
    await user.click(banner.getByRole("option", { name: "Age" }));
    expect(currentSearch()).toBe("?sort=age");
    await user.click(banner.getByRole("button", { name: /Sort direction/ }));
    expect(currentSearch()).toBe("?sort=age&dir=desc");

    await waitFor(() => {
      const startedOver = userRequests(fetchMock).some(
        (p) => p.get("sort") === "age" && p.get("dir") === "desc" && p.get("page") === "1"
      );
      expect(startedOver).toBe(true);
    });
  });

  it("removing a chip drops that filter from the URL", async () => {
    const user = userEvent.setup();
    renderApp("/?nationality=Brazil&hobby=Hiking");
    await screen.findByRole("heading", { name: /First01/ });

    await user.click(screen.getByRole("button", { name: "Remove filter: Hobby Hiking" }));
    expect(currentSearch()).toBe("?nationality=Brazil");
  });

  it("'Clear all' removes search and filters but keeps the sort", async () => {
    const user = userEvent.setup();
    renderApp("/?search=an&nationality=Brazil&hobby=Hiking&sort=age&dir=desc");
    await screen.findByRole("heading", { name: /First01/ });

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(currentSearch()).toBe("?sort=age&dir=desc");
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
});

describe("search box", () => {
  it("waits for a pause in typing: one request for the final text, none per keystroke", async () => {
    const user = userEvent.setup();
    const fetchMock = installFakeApi();
    renderApp();
    await screen.findByRole("heading", { name: "First01 Last01" });
    fetchMock.mockClear();

    await user.type(screen.getByRole("searchbox"), "mohd");
    
    expect(currentSearch()).toBe("");

    await waitFor(() => expect(currentSearch()).toBe("?search=mohd"));
    await waitFor(() => expect(userRequests(fetchMock).some((p) => p.get("search") === "mohd")).toBe(true));
  
    const searches = userRequests(fetchMock).map((p) => p.get("search"));
    expect(searches).not.toContain("m");
    expect(searches).not.toContain("mo");
    expect(searches).not.toContain("moh");
  });

  it("replaces the current history entry instead of adding one per search, while ticking a filter does add one", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("heading", { name: "First01 Last01" });
    expect(screen.getByTestId("navigation-type")).toHaveTextContent("POP"); // the initial load

    await user.type(screen.getByRole("searchbox"), "abc");
    await waitFor(() => expect(currentSearch()).toBe("?search=abc"));
    
    expect(screen.getByTestId("navigation-type")).toHaveTextContent("REPLACE");

    const sidebar = screen.getByRole("complementary", { name: "Filters" });
    await user.click(await within(sidebar).findByRole("checkbox", { name: /Japan/ }));
   
    expect(screen.getByTestId("navigation-type")).toHaveTextContent("PUSH");
  });

  it("the clear (×) button empties the box and the search at once", async () => {
    const user = userEvent.setup();
    renderApp("/?search=mohd");
    await screen.findByRole("heading", { name: /First01/ });

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(currentSearch()).toBe("");
  });
});

describe("empty and error states", () => {
  it("shows 'No users found' with a Clear filters button that resets the filters", async () => {
    installFakeApi({ total: () => 0 });
    const user = userEvent.setup();
    renderApp("/?search=zzzz&nationality=Brazil");

    expect(await screen.findByText("No users found")).toBeInTheDocument();
    expect(screen.getByText("Try a different search term or remove a filter to see more results.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(currentSearch()).toBe("");
  });

  it.each([
    ["a search", "/?search=zzzz"],
    ["a nationality filter", "/?nationality=Brazil"],
    ["a hobby filter", "/?hobby=Hiking"],
  ])("says 'No users found', not that the directory is empty, when %s matches nobody", async (_name, url) => {
    installFakeApi({ total: () => 0 });
    renderApp(url);

    expect(await screen.findByText("No users found")).toBeInTheDocument();
    expect(screen.queryByText("The directory is empty")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("says the directory is empty, with nothing to clear, when there is no search or filter and no users", async () => {
    installFakeApi({ total: () => 0 });
    renderApp("/");

    expect(await screen.findByText("The directory is empty")).toBeInTheDocument();
    expect(screen.getByText("There are no users to show yet.")).toBeInTheDocument();
   
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    expect(screen.queryByText("No users found")).not.toBeInTheDocument();
    expect(screen.queryByText(/remove a filter/)).not.toBeInTheDocument();
  });

  it("a search of only spaces is not a search, so it still counts as an empty directory", async () => {
    installFakeApi({ total: () => 0 });
    renderApp("/?search=%20%20");

    expect(await screen.findByText("The directory is empty")).toBeInTheDocument();
  });

  it("shows an error with Retry when the API fails, and recovers on retry", async () => {
    installFakeApi({ failUsers: 1 });
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByText("Couldn't load the directory")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "First01 Last01" })).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load the directory")).not.toBeInTheDocument();
  });
});

describe("mobile filter sheet", () => {
  it("drafts changes without touching the URL, and only applies them on 'Show N users'", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("heading", { name: "First01 Last01" });

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });

    await user.click(await within(dialog).findByRole("checkbox", { name: /Japan/ }));
   
    expect(await within(dialog).findByRole("button", { name: "Show 35 users" })).toBeInTheDocument();

    expect(currentSearch()).toBe("");

    await user.click(within(dialog).getByRole("button", { name: "Show 35 users" }));
    expect(currentSearch()).toBe("?nationality=Japan");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says 'Show all users' instead of a number when nothing is selected", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("heading", { name: "First01 Last01" });

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });

    expect(await within(dialog).findByRole("button", { name: "Show all users" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /^Show \d+ users$/ })).not.toBeInTheDocument();
  });

  it("switches to a count when a box is ticked, and back to 'Show all users' when it is unticked", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("heading", { name: "First01 Last01" });

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });

    await user.click(await within(dialog).findByRole("checkbox", { name: /Japan/ }));
    expect(await within(dialog).findByRole("button", { name: "Show 35 users" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("checkbox", { name: /Japan/ }));
    expect(await within(dialog).findByRole("button", { name: "Show all users" })).toBeInTheDocument();
  });

  it("'Clear all' changes the button to 'Show all users', and tapping it removes the filters", async () => {
    const user = userEvent.setup();
    renderApp("/?nationality=Brazil&hobby=Hiking");
    await screen.findByRole("heading", { name: /First01/ });

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });
    expect(await within(dialog).findByRole("button", { name: "Show 25 users" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Clear all" }));
    await user.click(await within(dialog).findByRole("button", { name: "Show all users" }));

    expect(currentSearch()).toBe("");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the count while a search is active, even with no box ticked: that is not all users", async () => {
    const user = userEvent.setup();
    renderApp("/?search=an");
    await screen.findByRole("heading", { name: /First01/ });

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });

    expect(await within(dialog).findByRole("button", { name: "Show 45 users" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Show all users" })).not.toBeInTheDocument();
  });

  it("closing with × discards the draft", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("heading", { name: "First01 Last01" });

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });
    await user.click(await within(dialog).findByRole("checkbox", { name: /Japan/ }));
    await user.click(within(dialog).getByRole("button", { name: "Close filters" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(currentSearch()).toBe("");
  });

  it("Escape closes the sheet and discards the draft", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("heading", { name: "First01 Last01" });

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });
    await user.click(await within(dialog).findByRole("checkbox", { name: /Japan/ }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(currentSearch()).toBe("");
  });

  it("starts from the applied filters, and 'Clear all' in the sheet clears the draft", async () => {
    const user = userEvent.setup();
    renderApp("/?nationality=Brazil&hobby=Hiking");
    await screen.findByRole("heading", { name: /First01/ });

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });
    expect(await within(dialog).findByRole("checkbox", { name: /Brazil/ })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /Hiking/ })).toBeChecked();

    await user.click(within(dialog).getByRole("button", { name: "Clear all" }));
    expect(within(dialog).getByRole("checkbox", { name: /Brazil/ })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /Hiking/ })).not.toBeChecked();
    
    expect(currentSearch()).toBe("?nationality=Brazil&hobby=Hiking");
  });

  it("the Filters button shows how many nationality + hobby filters are applied", async () => {
    renderApp("/?nationality=Brazil&nationality=Japan&hobby=Hiking");
    await screen.findByRole("heading", { name: /First01/ });
    expect(screen.getByRole("button", { name: /^Filters/ })).toHaveTextContent("3");
  });
});

describe("highlighting the hobbies you filtered by", () => {
  const firstCard = () => screen.getByRole("heading", { name: "First01 Last01" }).closest("article")!;
  const outlinedChips = (card: HTMLElement) =>
    within(card)
      .getAllByRole("listitem")
      .filter((li) => li.classList.contains("ring-accent"))
      .map((li) => li.textContent?.replace(" (matches your filter)", ""));

  it("outlines the selected hobby on each card", async () => {
    renderApp("/?hobby=Yoga");
    await screen.findByRole("heading", { name: "First01 Last01" });
    expect(outlinedChips(firstCard())).toEqual(["Yoga"]);
  });

  it("outlines nothing when no hobby is selected", async () => {
    renderApp("/");
    await screen.findByRole("heading", { name: "First01 Last01" });
    expect(outlinedChips(firstCard())).toEqual([]);
  });

  it("follows the filter as it changes: ticking a hobby outlines it, unticking removes it", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await screen.findByRole("heading", { name: "First01 Last01" });
    expect(outlinedChips(firstCard())).toEqual([]);

    await user.click(await screen.findByRole("checkbox", { name: /Hiking/ }));
    await screen.findByRole("heading", { name: "First01 Last01" });
    await waitFor(() => expect(outlinedChips(firstCard())).toEqual(["Hiking"]));

    await user.click(screen.getByRole("checkbox", { name: /Hiking/ }));
    await waitFor(() => expect(outlinedChips(firstCard())).toEqual([]));
  });
});

describe("selected count in the sidebar", () => {
  const hobbiesSection = () => screen.getByRole("region", { name: "Hobbies" });
  const nationalitySection = () => screen.getByRole("region", { name: "Nationality" });

  it("shows how many are ticked under each heading, counted separately", async () => {
    renderApp("/?hobby=Hiking&hobby=Yoga&nationality=Brazil");
    await screen.findByRole("heading", { name: "First01 Last01" });

    expect(within(hobbiesSection()).getByText("2 selected")).toBeInTheDocument();
    expect(within(nationalitySection()).getByText("1 selected")).toBeInTheDocument();
  });

  it("shows it under Nationality when only nationalities are ticked, and nothing under Hobbies", async () => {
    renderApp("/?nationality=Brazil&nationality=Japan");
    await screen.findByRole("heading", { name: "First01 Last01" });

    expect(within(nationalitySection()).getByText("2 selected")).toBeInTheDocument();
    expect(within(hobbiesSection()).queryByText(/selected/)).not.toBeInTheDocument();
  });

  it("shows nothing under either heading when nothing is ticked", async () => {
    renderApp("/");
    await screen.findByRole("heading", { name: "First01 Last01" });

    expect(within(nationalitySection()).queryByText(/selected/)).not.toBeInTheDocument();
    expect(within(hobbiesSection()).queryByText(/selected/)).not.toBeInTheDocument();
  });

  it("counts up as you tick hobbies, and goes away when you untick them all", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await screen.findByRole("heading", { name: "First01 Last01" });

    await user.click(await within(hobbiesSection()).findByRole("checkbox", { name: /Hiking/ }));
    expect(await within(hobbiesSection()).findByText("1 selected")).toBeInTheDocument();

    await user.click(within(hobbiesSection()).getByRole("checkbox", { name: /Yoga/ }));
    expect(await within(hobbiesSection()).findByText("2 selected")).toBeInTheDocument();

    await user.click(within(hobbiesSection()).getByRole("checkbox", { name: /Hiking/ }));
    await user.click(within(hobbiesSection()).getByRole("checkbox", { name: /Yoga/ }));
    await waitFor(() => expect(within(hobbiesSection()).queryByText(/selected/)).not.toBeInTheDocument());
  });

  it("counts up as you tick nationalities, without touching the Hobbies count", async () => {
    const user = userEvent.setup();
    renderApp("/?hobby=Hiking");
    await screen.findByRole("heading", { name: "First01 Last01" });

    await user.click(await within(nationalitySection()).findByRole("checkbox", { name: /Brazil/ }));
    expect(await within(nationalitySection()).findByText("1 selected")).toBeInTheDocument();

    await user.click(within(nationalitySection()).getByRole("checkbox", { name: /Japan/ }));
    expect(await within(nationalitySection()).findByText("2 selected")).toBeInTheDocument();
    expect(within(hobbiesSection()).getByText("1 selected")).toBeInTheDocument();

    await user.click(within(nationalitySection()).getByRole("checkbox", { name: /Brazil/ }));
    await user.click(within(nationalitySection()).getByRole("checkbox", { name: /Japan/ }));
    await waitFor(() => expect(within(nationalitySection()).queryByText(/selected/)).not.toBeInTheDocument());
  });

  it("shows the counts for the draft in the mobile sheet, for both lists", async () => {
    const user = userEvent.setup();
    renderApp("/?hobby=Hiking&nationality=Brazil");
    await screen.findByRole("heading", { name: /First01/ });

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });
    const sheetHobbies = () => within(dialog).getByRole("region", { name: "Hobbies" });
    const sheetNationality = () => within(dialog).getByRole("region", { name: "Nationality" });

    expect(await within(sheetHobbies()).findByText("1 selected")).toBeInTheDocument();
    expect(within(sheetNationality()).getByText("1 selected")).toBeInTheDocument();

    await user.click(within(sheetHobbies()).getByRole("checkbox", { name: /Yoga/ }));
    expect(await within(sheetHobbies()).findByText("2 selected")).toBeInTheDocument();
    await user.click(within(sheetNationality()).getByRole("checkbox", { name: /Japan/ }));
    expect(await within(sheetNationality()).findByText("2 selected")).toBeInTheDocument();

    
    const sidebar = screen.getByRole("complementary", { name: "Filters" });
    expect(within(within(sidebar).getByRole("region", { name: "Hobbies" })).getByText("1 selected")).toBeInTheDocument();
    expect(within(within(sidebar).getByRole("region", { name: "Nationality" })).getByText("1 selected")).toBeInTheDocument();
  });
});
