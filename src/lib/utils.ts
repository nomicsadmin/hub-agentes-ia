import { createCn } from "cn/config"

/*
 * cn com os tokens do Design System. Sem isto, "text-ui" é lido como
 * cor e apaga "text-ink" (e vice-versa) ao mesclar classes.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["micro", "meta", "ui", "body", "h3", "h2", "display"] }],
    },
    theme: {
      radius: ["row", "control", "bubble", "composer"],
    },
  },
})
