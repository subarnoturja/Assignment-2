import app from "./app"
import config from "./config"
import { initDB } from "./db"

const mainServer = () => {
    initDB()
    app.listen(config.port, () => {
        console.log(`This app is running on port ${config.port}`)
    })
}

mainServer();