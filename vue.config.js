module.exports = {
    lintOnSave: true,
    css: {
        loaderOptions: {
            scss: {
                prependData: `
                    @import "@/assets/styles/_mixins.scss";
                    @import "@/assets/styles/_utils.scss";
                `,
            }
        }
    },
    configureWebpack: {
        devtool: process.env.NODE_ENV !== "production" ? "eval" : false,
        module: {
            rules: [
                {
                    test: /\.mjs$/,
                    include: /node_modules/,
                    type: "javascript/auto"
                }
            ] 
        }
    },
    pluginOptions: {
        electronBuilder: {
            mainProcessFile: "src/main.ts",
            mainProcessWatch: ["src/main", "src/main-window"],
            rendererProcessFile: "src/render.ts",
            preload: "src/preload.ts",
            builderOptions: {
                productName: "BAR Lobby",
                directories: {
                    buildResources: "build"
                }
            },
        },
        autoRouting: {
            pages: "src/views",
            chunkNamePrefix: "view-",
            importPrefix: "@/views/",
            nested: false,
            dynamicImport: false,
            outFile: "src/routes.ts",
        }
    }
};
