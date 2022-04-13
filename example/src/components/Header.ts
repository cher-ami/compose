import { Component } from "../../../src"
import MainButton from "./MainButton"
import debug from "@wbe/debug"
const log = debug(`front:Header`)

type TStaticProps = {}

/**
 * @name Header
 */
export default class Header extends Component<TStaticProps> {
  public static attrName = "Header"

  public MainButton = this.add<MainButton[]>(MainButton)

  public mounted() {
    window.addEventListener("resize", this.resizeHandler)
  }

  public unmounted() {
    window.removeEventListener("resize", this.resizeHandler)
  }

  protected resizeHandler = () => {
    log("window.innerWidth", window.innerWidth)
  }
}
