import { Component } from "./";
import { StateSignal } from "@solid-js/signal";
const name = "Stack-";
const debug = require("debug")(`front:${name}`);

export interface IPage {
  $pageRoot: HTMLElement;
  pageName: string;
  instance: any;
  playIn?: () => Promise<void>;
  playOut?: (goFrom?: string, autoUnmountOnComplete?: boolean) => Promise<void>;
  unmount?: () => void;
}

export type TManagePageTransitionParams = {
  currentPage: Omit<IPage, "playIn">;
  mountNewPage: () => Promise<Omit<IPage, "playOut">>;
};

/**
 * AppComponent is a App class to extend
 */
export class Stack extends Component {
  // dispatch page is animating state
  public static pageIsAnimatingState = StateSignal<boolean>(false);
  public pageIsAnimating: boolean = false;

  public static pageContainerAttr = "data-page-transition-container";
  public static pageUrlAttr = "data-page-transition-url";

  public $root: HTMLElement;
  protected currentUrl: string = window.location.href;
  protected $pageContainer: HTMLElement;
  protected currentPage: IPage;
  protected prevPage: IPage;
  protected playOutComplete: boolean = true;
  protected playInComplete: boolean = true;

  // Register pages from parent class
  protected _pages: { [x: string]: any };
  protected pages(): { [x: string]: any } {
    return {};
  }

  constructor($root, props) {
    super($root, props);
    this.$root = document.querySelector(".App") || $root;
    this._pages = this.pages();
    this.$pageContainer = this.getPageContainer(this.$root);
    this.currentPage = this.getFirstPage();

    // start patch history
    this.patchHistoryStates();

    // init children components
    this.init();

    // start page events
    this.start();
  }

  /**
   * Life cycle
   */
  public start() {
    this.initEvents();
  }

  public update() {
    this.removeEvents();
    this.initEvents();
  }

  public stop() {
    this.removeEvents();
  }

  /**
   * EVENTS
   */
  protected initEvents() {
    const links = this.getLinksWithAttr();
    links.forEach((item: HTMLElement) => {
      item?.addEventListener("click", this.handleLinks);
    });
    window.addEventListener("pushState", this.handleHistory);
    window.addEventListener("replaceState", this.handleHistory);
    window.addEventListener("popstate", this.handleHistory);
  }

  protected removeEvents() {
    const links = this.getLinksWithAttr();
    links.forEach((item: HTMLElement) => {
      item?.removeEventListener("click", this.handleLinks);
    });
    window.removeEventListener("pushState", this.handleHistory);
    window.removeEventListener("replaceState", this.handleHistory);
    window.removeEventListener("popstate", this.handleHistory);
  }

  // ------------------------------------------------------------------------------------- HANDLER

  /**
   * Handle links
   * @param event
   */
  protected handleLinks = (event): void => {
    if (!event) return;
    event.preventDefault();
    // TODO ne pas bloquer la transition mais killer l'existante
    const url = event?.currentTarget?.getAttribute(Stack.pageUrlAttr);
    window.history.pushState({}, null, url);
  };

  /**
   * Handle history
   * @param event
   */
  protected handleHistory = async (event) => {
    // TODO ne pas bloquer la transition mais killer l'existante
    if (this.pageIsAnimating) return;

    const selectedUrl = event?.["arguments"]?.[2] || window.location.href;
    debug("selectedUrl", selectedUrl);
    if (!selectedUrl || selectedUrl === this.currentUrl) return;
    this.currentUrl = selectedUrl;

    // dispatch is animating
    Stack.pageIsAnimatingState.dispatch(true);
    this.pageIsAnimating = true;

    /**
     * Prepare current page to be playOut
     */
    const page = this.currentPage;
    const playOut = (goFrom: string, autoUnmountOnComplete = true) => {
      this.playOutComplete = false;
      page.instance.unmounted();
      return page.instance.playOut(page.$pageRoot, goFrom).then(() => {
        this.playOutComplete = true;
        autoUnmountOnComplete && unmount();
      });
    };
    const unmount = () => {
      page.$pageRoot.remove();
    };

    const currentPage = {
      ...page,
      playOut,
      unmount,
    };

    /**
     * Prepare mount new page to be playIn
     */
    const mountNewPage = async (): Promise<IPage> => {
      const newDocument = await this.fetchNewDocument(selectedUrl);
      document.title = newDocument.title;

      const newPageContainer = this.getPageContainer(newDocument.body);
      const newPageRoot = this.getPageRoot(newPageContainer);
      this.$pageContainer.appendChild(newPageRoot);

      // important to instance the page after append it in DOM
      const newPageName = this.getPageName(newPageRoot);
      const newPageInstance = this.getPageInstance(newPageName, newPageRoot);
      const playIn = () => {
        this.playInComplete = false;
        return newPageInstance.playIn(newPageInstance.$root, this.currentPage.pageName).then(() => {
          this.playInComplete = true;
        });
      };

      // update local stack events (history)
      this.update();

      return {
        $pageRoot: newPageRoot,
        pageName: newPageName,
        instance: newPageInstance,
        playIn,
      };
    };

    /**
     * Start page transition manager who resolve newPage obj
     */

    try {
      const newPage = await this.pageTransitions({
        currentPage,
        mountNewPage,
      });
      // end, set new page
      this.prevPage = this.currentPage;
      this.currentPage = newPage;

      // dispatch is animating
      Stack.pageIsAnimatingState.dispatch(false);
      this.pageIsAnimating = false;

      debug("ended!");
    } catch (e) {
      debug("ERROR");
    }
  };

  /**
   * Page transitions
   * Default transition to override from parent component
   * @param currentPage
   * @param mountNewPage
   * @protected
   */
  protected pageTransitions({
    currentPage,
    mountNewPage,
  }: TManagePageTransitionParams): Promise<IPage> {
    return new Promise(async (resolve) => {
      const newPage = await mountNewPage();
      await currentPage.playOut(newPage.pageName);
      await newPage.playIn();
      resolve(newPage);
    });
  }

  // ------------------------------------------------------------------------------------- PREPARE PAGE

  protected getPageContainer($root): HTMLElement {
    return $root.querySelector(`*[${Stack.pageContainerAttr}]`);
  }

  protected getPageRoot($container: HTMLElement): HTMLElement {
    return $container.children[$container.children?.length - 1 || 0] as HTMLElement;
  }

  protected getPageName($pageRoot: HTMLElement): string {
    for (const page of Object.keys(this._pages)) {
      if (page == $pageRoot.getAttribute(Component.componentAttr)) return page;
    }
  }

  protected getPageInstance(pageName: string, $pageRoot?: HTMLElement) {
    const classComponent = this._pages[pageName];
    return classComponent ? new classComponent($pageRoot, {}, pageName) : null;
  }

  protected getFirstPage(): IPage {
    const $pageRoot = this.getPageRoot(this.$pageContainer);
    const pageName = this.getPageName($pageRoot);
    const instance = this.getPageInstance(pageName, $pageRoot);
    const playIn = () => instance.playIn($pageRoot);
    const playOut = () => instance.playIn($pageRoot);
    return { $pageRoot, pageName, instance, playIn, playOut };
  }

  // ------------------------------------------------------------------------------------- HELPERS

  /**
   * Get link with with URL ATTR
   */
  protected getLinksWithAttr(): HTMLElement[] {
    return [
      // @ts-ignore
      ...this.$root?.querySelectorAll(`*[${Stack.pageUrlAttr}]`),
    ];
  }

  /**
   * Fetch URL
   * @param url
   * @protected
   */
  protected async fetchNewDocument(url: string) {
    try {
      const data = await fetch(url);
      const html = await data.text();
      const parser = new DOMParser();
      return parser.parseFromString(html, "text/html");
    } catch (e) {
      throw new Error("Fetch new document failed");
    }
  }

  /**
   * While History API does have `popstate` event, the only
   * proper way to listen to changes via `push/replaceState`
   * is to monkey-patch these methods.
   * https://stackoverflow.com/a/4585031
   * https://stackoverflow.com/questions/5129386/how-to-detect-when-history-pushstate-and-history-replacestate-are-used
   */
  private patchHistoryStates(): void {
    if (typeof window.history !== "undefined") {
      for (const type of ["pushState", "replaceState"]) {
        const original = window.history[type];
        window.history[type] = function () {
          const result = original.apply(this, arguments);
          const event = new Event(type);
          event["arguments"] = arguments;
          window.dispatchEvent(event);
          return result;
        };
      }
    }
  }
}