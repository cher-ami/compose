import { Component, TNewComponent } from "./Component"
import debug from "@wbe/debug"
const log = debug("compose:Stack")

export interface IPage {
  $pageRoot: HTMLElement
  pageName: string
  instance: any
  playIn?: () => Promise<void>
  playOut?: (comeFrom?: string, autoRemoveOnComplete?: boolean) => Promise<void>
  remove?: () => void
}

export type TPromiseRef = { reject: () => void }
export type TPageList = { [x: string]: TNewComponent<any, any> }
export type TCurrentPage = Omit<IPage, "playIn">
export type TNewPage = Omit<IPage, "playOut">
export type TManagePageTransitionParams = {
  currentPage: TCurrentPage
  mountNewPage: () => Promise<TNewPage>
}

/**
 * Stack
 * In order to get dynamic page fetching and refreshing without reload,
 * `Stack` extended class is a middleware class between our App root component
 * and `Component` extended class.
 */
export class Stack extends Component {
  // DOM attributes
  public static pageContainerAttr = "data-page-transition-container"
  public static pageWrapperAttr = "data-page-transition-wrapper"
  public static pageUrlAttr = "data-page-transition-url"

  // page container
  public $pageContainer: HTMLElement
  public $pageWrapper: HTMLElement

  // reload if document is fetching
  public forcePageReloadIfDocumentIsFetching: boolean = false
  // force all pages to reload instead the dynamic new document fetching process
  public forcePageReload: boolean = false
  // disable links during transition
  public disableLinksDuringTransitions: boolean = false
  public disableHistoryDuringTransitions: boolean = false

  // the current URL to request
  protected currentUrl: string = null
  protected currentPage: IPage
  protected prevPage: IPage
  protected isFirstPage = true
  // Register pages from parent class
  protected _pageList: TPageList
  protected pages(): TPageList {
    return {}
  }

  // check if new page document html is in fetching step
  private _documentIsFetching: boolean = false
  // check if page is in animate process
  private _pageIsAnimating: boolean = false

  // promise ref used in playIn and playOut medthods to keep reject promise
  protected playInPromiseRef: TPromiseRef = { reject: undefined }
  protected playOutPromiseRef: TPromiseRef = { reject: undefined }

  constructor($root, props) {
    super($root, props)
    this.$pageContainer = this.getPageContainer()
    this.$pageWrapper = this.getPageWrapper(this.$pageContainer)
    this._pageList = this.pages()
    this.currentPage = this.getFirstCurrentPage()
    // start patch history
    this.patchHistoryStates()
    // start page events
    this.start()
  }

  // --------------------------------------------------------------------------- LIFE CICLE

  /**
   * Start
   * @protected
   */
  protected start(): void {
    this.handleHistory()
    this.initHistoryEvent()
    this.listenLinks()
  }

  /**
   * Update
   * @protected
   */
  protected updateLinks(): void {
    this.unlistenLinks()
    this.listenLinks()
  }

  /**
   * Stop
   * @protected
   */
  protected stop(): void {
    this.removeHistoryEvent()
    this.unlistenLinks()
  }

  /**
   * Listen available dynamics links
   * @private
   */
  private listenLinks() {
    const links = this.getLinksWithAttr()
    links.forEach((item: HTMLElement) => {
      item?.addEventListener("click", this.handleLinks)
    })
  }

  /**
   * Stop to listen dynamics links
   * @private
   */
  private unlistenLinks() {
    const links = this.getLinksWithAttr()
    links.forEach((item: HTMLElement) => {
      item?.removeEventListener("click", this.handleLinks)
    })
  }

  /**
   * Initialize events
   * @private
   */
  private initHistoryEvent() {
    ;["pushState", "replaceState", "popstate"].forEach((event) => {
      window.addEventListener(event, this.handleHistory.bind(this))
    })
  }

  /**
   * Remove events
   * @private
   */
  private removeHistoryEvent() {
    ;["pushState", "replaceState", "popstate"].forEach((event) => {
      window.removeEventListener(event, this.handleHistory)
    })
  }

  // --------------------------------------------------------------------------- HANDLERS

  /**
   * Handle links
   * @param event
   */
  private handleLinks = (event): void => {
    if (!event) return
    // get page url attr
    const url = event?.currentTarget?.getAttribute(Stack.pageUrlAttr)
    // if disable transtiions is active, open new page
    if (this.forcePageReload) {
      window.open(url, "_self")
    }
    // prevent to following the link
    event.preventDefault()

    if (this.disableLinksDuringTransitions && this._pageIsAnimating) return

    // push it in history
    window.history.pushState({}, null, url)
  }

  /**
   * Handle history
   * @param event
   */
  private async handleHistory(event?): Promise<void> {
    if (this.disableHistoryDuringTransitions && this._pageIsAnimating) return

    // get URL to request
    const requestUrl = event?.["arguments"]?.[2] || window.location.pathname
    log("handleHistory > requestUrl", requestUrl)
    // check before continue
    if (!requestUrl || requestUrl === this.currentUrl) return
    // SECURITY if document is fetching, just reload the page
    if (
      (this.forcePageReloadIfDocumentIsFetching && this._documentIsFetching) ||
      this.forcePageReload
    ) {
      window.open(requestUrl, "_self")
      return
    }

    // keep new request URL
    this.currentUrl = requestUrl

    // if page is animating
    if (this._pageIsAnimating) {
      // reject current promise playIn playOut
      this.playOutPromiseRef.reject?.()
      this.playInPromiseRef.reject?.()
      this._pageIsAnimating = false
      log(
        "handleHistory > page is animating, reject current transitions promises + remove page wrapper content"
      )
      // remove all page wrapper children
      this.$pageWrapper.querySelectorAll(":scope > *").forEach((el) => el.remove())
      // hack for the first load
      this.isFirstPage && await new Promise((resolve) => setTimeout(resolve, 1))
    }

    // Start page transition manager who resolve newPage obj
    try {
      const newPage = await this.pageTransitionsMiddleware({
        currentPage: this.prepareCurrentPage(),
        mountNewPage: () => this.prepareMountNewPage(requestUrl),
      })
      this.isFirstPage = false
      this._pageIsAnimating = false
      this.prevPage = this.currentPage
      this.currentPage = newPage
      this.updateLinks()
    } catch (e) {
      throw new Error("Error on page transition middleware")
    }
  }

  /**
   * Prepare current page
   */
  private prepareCurrentPage(): IPage | null {
    const page = this.currentPage

    // prepare remove dom page
    const _remove = () => {
      page.$pageRoot.remove()
    }

    // prepare playout
    const playOut = (goTo: string, autoRemoveOnComplete = true) => {
      // execute unmounted page method
      page.instance._unmounted()
      // store current playOut (specific anim first, default anim if first doesn't exist)
      const _playOutRef = page.instance._playOutRef.bind(page.instance)
      // return playOut function used by pageTransitons method
      return _playOutRef(goTo, this.playOutPromiseRef)
        .then(() => {
          autoRemoveOnComplete && _remove()
        })
        .catch(() => {})
    }

    // if is first page, return nothing
    if (this.isFirstPage) {
      return null
    }

    return {
      ...page,
      playOut,
      remove: _remove,
    }
  }

  /**
   *  Prepare mount new page
   *  - request new page
   *  - change title
   *  - inject new DOM in current DOM container
   *  - prepare playIn
   * @param requestUrl
   */
  private async prepareMountNewPage(requestUrl: string): Promise<IPage> {
    // prepare playIn transition for new Page
    const _preparePlayIn = (pageInstance): Promise<any> => {
      // select playIn method
      const _playInRef = pageInstance._playInRef.bind(pageInstance)
      // return playIn function used by pageTransitons method
      return _playInRef(this.currentPage.pageName, this.playInPromiseRef)?.catch?.(() => {})
    }

    // case of is first page
    if (this.isFirstPage) {
      return {
        $pageRoot: this.currentPage.$pageRoot,
        pageName: this.currentPage.pageName,
        instance: this.currentPage.instance,
        playIn: () => _preparePlayIn(this.currentPage.instance),
      }
    }

    try {
      // fetch new page document
      const newDocument = await this.fetchNewDocument(requestUrl, new AbortController())
      // change page title
      document.title = newDocument.title

      // inject new page content in pages Container
      const newPageWrapper = this.getPageWrapper(newDocument.body)
      const newPageRoot = this.getPageRoot(newPageWrapper)
      this.$pageWrapper.appendChild(newPageRoot)

      //  instance the page after append it in DOM
      const newPageName = this.getPageName(newPageRoot)
      const newPageInstance = this.getPageInstance(newPageName, newPageRoot)

      return {
        $pageRoot: newPageRoot,
        pageName: newPageName,
        instance: newPageInstance,
        playIn: () => _preparePlayIn(newPageInstance),
      }
    } catch (e) {
      throw new Error(`Fetch new document failed on url: ${requestUrl}`)
    }
  }

  /**
   * Page transitions middleware
   * Default transition to override from parent component
   * @param currentPage
   * @param mountNewPage
   * @protected
   */
  protected pageTransitionsMiddleware({
    currentPage,
    mountNewPage,
  }: TManagePageTransitionParams): Promise<IPage> {
    return new Promise(async (resolve) => {
      // inject new page in DOM + create page class instance
      try {
        // fetch and get new page
        const newPage = await mountNewPage()

        // prepare playOut and pass automatically goTo newPage name as param
        const preparedCurrentPage = {
          ...currentPage,
          playOut: (goTo: string, autoRemoveOnComplete = true) =>
            currentPage?.playOut(newPage.pageName, autoRemoveOnComplete),
        }

        // called when transition is completed
        const resolver = () => {
          resolve(newPage)
        }

        // change page is animating state (need to be changed after mount new page)
        this._pageIsAnimating = true

        // return page transition function
        return this.pageTransitions(preparedCurrentPage, newPage, resolver)
      } catch (e) {
        log("mountNewPage failed", e)
      }
    })
  }

  /**
   * Page transition
   * @param currentPage
   * @param newPage
   * @param complete
   * @protected
   */
  protected async pageTransitions(
    currentPage: IPage,
    newPage: IPage,
    complete: () => void
  ): Promise<any> {
    await currentPage.playOut()
    await newPage.playIn()
    complete()
  }
  // --------------------------------------------------------------------------- PREPARE PAGE

  /**
   * Get page container HTMLElement
   * @private
   */
  private getPageContainer(): HTMLElement {
    return document.body.querySelector(`*[${Stack.pageContainerAttr}]`)
  }

  /**
   * Get page wrapper HTMLElement
   * @param $node
   * @private
   */
  private getPageWrapper($node: HTMLElement): HTMLElement {
    return $node.querySelector(`*[${Stack.pageWrapperAttr}]`)
  }

  /**
   * Get page root HTMLElement
   * @param $wrapper
   * @private
   */
  private getPageRoot($wrapper: HTMLElement): HTMLElement {
    return $wrapper.children[$wrapper.children?.length - 1 || 0] as HTMLElement
  }

  /**
   * Get page name
   * @param $pageRoot
   * @private
   */
  private getPageName($pageRoot: HTMLElement): string {
    for (const page of Object.keys(this._pageList)) {
      if (page == $pageRoot.getAttribute(Component.componentAttr)) return page
    }
  }

  /**
   * Get page instance
   * @param pageName
   * @param $pageRoot
   * @private
   */
  private getPageInstance(pageName: string, $pageRoot?: HTMLElement): Component {
    const classComponent = this._pageList[pageName]
    return classComponent ? new classComponent($pageRoot, {}, pageName) : null
  }

  /**
   * Get First current page
   * @private
   */
  private getFirstCurrentPage(): IPage {
    const $pageRoot = this.getPageRoot(this.$pageWrapper)
    const pageName = this.getPageName($pageRoot)
    const instance = this.getPageInstance(pageName, $pageRoot)
    const playIn = () => instance._playInRef()
    const playOut = () => instance._playOutRef()
    return { $pageRoot, pageName, instance, playIn, playOut }
  }

  // --------------------------------------------------------------------------- HELPERS

  /**
   * Get link with with URL ATTR
   */
  private getLinksWithAttr(): HTMLElement[] {
    return [
      // @ts-ignore
      ...this.$pageContainer?.querySelectorAll(`*[${Stack.pageUrlAttr}]`),
    ]
  }

  /**
   * Fetch new document from specific URL
   * @param url
   * @param controller
   * @protected
   */
  private fetchNewDocument(url: string, controller: AbortController): Promise<any> {
    // if document is already fetching, abort the current fetch
    if (this._documentIsFetching) {
      controller.abort()
      this._documentIsFetching = false
      log("this._documentIsFetching = true, abort", this._documentIsFetching)
    }

    // change document is fetching state
    this._documentIsFetching = true

    // fetch new document
    return fetch(url, {
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          this._documentIsFetching = false
          throw new Error("Something went wrong")
        }
      })
      .then((html) => {
        this._documentIsFetching = false
        const parser = new DOMParser()
        return parser.parseFromString(html, "text/html")
      })
      .catch((error) => {
        throw new Error("Fetch new document failed")
      })
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
        const original = window.history[type]
        window.history[type] = function () {
          const result = original.apply(this, arguments)
          const event = new Event(type)
          event["arguments"] = arguments
          window.dispatchEvent(event)
          return result
        }
      }
    }
  }
}
