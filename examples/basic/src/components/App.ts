import HomePage from "../pages/HomePage"
import AboutPage from "../pages/AboutPage"
import WorkPage from "../pages/WorkPage"
import debug from "@cher-ami/debug"
import Footer from "./Footer"
import { IPage, Stack } from "../../../../src"
const log = debug(`front:App`)

/**
 * @name App
 */
export class App extends Stack {
  public static attrName = "App"
  // @ts-ignore
  public footer = this.add<Footer>(Footer)

  enableCache = true
  keepPageNumberDuringTransitions = 2

  // @ts-ignore
  public addPages() {
    return {
      HomePage,
      AboutPage,
      WorkPage,
    }
  }

  public mounted() {
    log("this.footer", this.footer)
  }

  protected async pageTransitions(
    currentPage: IPage,
    newPage: IPage,
    complete: () => void
  ): Promise<any> {
    newPage.$pageRoot.style.visibility = "hidden"
    currentPage.playOut()
    await newPage.playIn()
    complete()
  }

  // disableLinksDuringTransitions = true
  // disableHistoryDuringTransitions = true
  // forcePageReloadIfDocumentIsFetching = true
}
