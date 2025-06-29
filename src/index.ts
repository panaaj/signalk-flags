// **** Signal K flags resources ****
import { Application, Request, Response } from 'express'
import { constants } from 'fs'
import { access } from 'fs/promises'
import path from 'path'

import {
  Delta,
  PathValue,
  Plugin,
  ServerAPI,
  Update,
  hasValues
} from '@signalk/server-api'
import * as openapi from './openApi.json'

import { MID } from './mid'

type FlagAspect = '1x1' | '4x3'

interface SKDeltaSubscription {
  context: string
  subscribe: Array<{ path: string; period: number }>
}

export interface FlagsApp extends ServerAPI, Application {
  subscriptionmanager: {
    subscribe: (
      subscribe: SKDeltaSubscription,
      unsubscribes: Array<any>,
      errorCallback: (error: any) => void,
      deltaCallback: (delta: Delta) => void
    ) => void
  }
}

const CONFIG_SCHEMA = {
  properties: {}
}

const CONFIG_UISCHEMA = {}

module.exports = (server: FlagsApp): Plugin => {
  let subscriptions: any[] = [] // stream subscriptions

  const FLAGS_API_PATH = '/signalk/v2/api/resources/flags'
  let IMG_BASE_PATH = ''

  const plugin: Plugin = {
    id: 'signalk-flags',
    name: 'Country Flag Resources',
    schema: () => CONFIG_SCHEMA,
    uiSchema: () => CONFIG_UISCHEMA,
    start: (options: any, restart: any) => {
      doStartup(options)
    },
    stop: () => {
      doShutdown()
    },
    registerWithRouter: (router) => {
      server.debug(`Required for OpenApi support.`)
      return router
    },
    getOpenApi: () => Object.assign({}, openapi)
  }

  let settings: any = {}

  const doStartup = (options: any) => {
    try {
      server.debug(`${plugin.name} starting.......`)
      if (options) {
        settings = options
      } else {
        // save defaults if no options loaded
        server.savePluginOptions(settings, () => {
          server.debug(`Default configuration applied...`)
        })
      }
      server.debug(`Applied configuration: ${JSON.stringify(settings)}`)
      server.setPluginStatus(`Started`)

      // initialise plugin
      initialise()
    } catch (error) {
      const msg = `Started with errors!`
      server.setPluginError(msg)
      server.error('error: ' + error)
    }
  }

  const doShutdown = () => {
    server.debug(`${plugin.name} stopping.......`)
    server.debug('** Un-registering Update Handler(s) **')
    subscriptions.forEach((b) => b())
    subscriptions = []
    const msg = 'Stopped.'
    server.setPluginStatus(msg)
  }

  /**
   * initialise plugin
   */
  const initialise = () => {
    server.debug('Initialising ....')
    // setup subscriptions
    initSubscriptions()
    initFs()
    initFlagsEndpoints()
  }

  // register DELTA stream message handler
  const initSubscriptions = () => {
    server.debug('Initialising Stream Subscription....')

    const subscription: SKDeltaSubscription = {
      context: 'vessels.*',
      subscribe: [
        {
          path: '',
          period: 500
        }
      ]
    }

    server.subscriptionmanager.subscribe(
      subscription,
      subscriptions,
      (error) => {
        server.error(`${plugin.id} Error: ${error}`)
      },
      (delta: Delta) => {
        if (!delta.updates) {
          return
        }
        const context = delta.context
        delta.updates.forEach((u: Update) => {
          if (!hasValues(u)) {
            return
          }
          u.values.forEach((v: PathValue) => {
            if (v.path === '' && v.value && 'mmsi' in (v.value as object)) {
              const country = countryFromMmsi((v.value as any).mmsi)
              if (country) {
                server.handleMessage(plugin.id, {
                  context: context,
                  updates: [
                    {
                      values: [
                        {
                          path: 'flag',
                          value: country[0]
                        },
                        {
                          path: 'port',
                          value: country[3]
                        }
                      ]
                    }
                  ]
                })
              }
            }
          })
        })
      }
    )
  }

  /**
   * Check filesystem path(s)
   */
  const initFs = async () => {
    const p = path.resolve(server.getDataDirPath()).split('/')
    const sp = p.slice(0, p.indexOf('.signalk') + 1).join('/')
    // dev env
    const DEV_PATH = path.join(
      sp,
      'node_modules',
      plugin.id,
      'node_modules',
      'flag-icons',
      'flags'
    )
    // prod env
    const PRD_PATH = path.join(sp, 'node_modules', 'flag-icons', 'flags')

    try {
      await access(PRD_PATH, constants.W_OK | constants.R_OK)
      server.debug(`${PRD_PATH} - OK...Flag images found.`)
      IMG_BASE_PATH = PRD_PATH
    } catch (error) {
      server.debug(`${PRD_PATH} does NOT exist!`)
      server.debug(`Trying secondary path....${DEV_PATH}`)
      try {
        await access(DEV_PATH, constants.W_OK | constants.R_OK)
        server.debug(`${DEV_PATH} - OK...Flag images found.`)
        IMG_BASE_PATH = DEV_PATH
      } catch (error) {
        server.debug(`${DEV_PATH} does NOT exist either!`)
      }
    }
  }

  /**
   * Initialise flag resource endpoints
   */
  const initFlagsEndpoints = () => {
    server.debug(`** Registering Flag resources endpoint(s) **`)

    server.get(
      `${FLAGS_API_PATH}/mmsi/:mmsi`,
      (req: Request, res: Response) => {
        server.debug(`** ${req.method} ${req.path}`)
        iconFromMmsi(req.params.mmsi, req.query.aspect as FlagAspect, res)
      }
    )

    server.get(
      `${FLAGS_API_PATH}/country/:code`,
      (req: Request, res: Response) => {
        server.debug(`** ${req.method} ${req.path}`)
        iconFromCountryCode(
          req.params.code,
          req.query.aspect as FlagAspect,
          res
        )
      }
    )
  }

  /**
   * Send flag for the supplied two letter country code
   * @param aspect Aspect ratio default= '4x3'
   * @returns svg file contents
   */
  const iconFromCountryCode = async (
    code: string,
    aspect: FlagAspect = '4x3',
    res: Response
  ) => {
    try {
      const flag = `${IMG_BASE_PATH}/${aspect}/${code.toLowerCase()}.svg`
      // check flag file exists
      await access(flag, constants.R_OK)
      res.sendFile(flag, (err) => {
        if (err) {
          res.status(400).json({
            state: 'FAILED',
            statusCode: 400,
            message: (err as Error).message
          })
        }
      })
    } catch (error) {
      res.status(400).json({
        state: 'FAILED',
        statusCode: 400,
        message: `Flag for supplied country code (${code}) NOT found!`
      })
      return
    }
  }

  /**
   * Send flag derived from the supplied MMSI
   * @param aspect Flag icon aspect ratio '1x1' or '4x3'
   * @returns svg file contents
   */
  const iconFromMmsi = async (
    mmsi: string,
    aspect: FlagAspect = '4x3',
    res: Response
  ) => {
    try {
      const country = countryFromMmsi(mmsi)
      const flag = `${IMG_BASE_PATH}/${aspect}/${country[0].toLowerCase()}.svg`
      // check flag file exists
      await access(flag, constants.R_OK)
      res.sendFile(flag, (err) => {
        if (err) {
          res.status(400).json({
            state: 'FAILED',
            statusCode: 400,
            message: (err as Error).message
          })
        }
      })
    } catch (error) {
      res.status(400).json({
        state: 'FAILED',
        statusCode: 400,
        message: `Flag for supplied MMSI (${mmsi}) not found!`
      })
      return
    }
  }

  /**
   * Get country details from supplied MMSI
   * @param mmsi Maritime mobile service identifier
   * @returns Array containing country details
   */
  const countryFromMmsi = (mmsi: number | string): string[] => {
    if (typeof mmsi === 'number') {
      mmsi = mmsi.toString()
    }
    const mid = mmsi.slice(0, 3)
    return MID[mid]
  }

  return plugin
}
