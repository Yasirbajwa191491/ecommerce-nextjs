import "styled-components";
import { AppTheme } from "@/lib/theme";

declare module "styled-components" {
  export interface DefaultTheme extends AppTheme {}
}
