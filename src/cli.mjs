#!/usr/bin/env node
import { parseArgs } from 'node:util'

import { GetUiCli } from './GetUiCli.mjs'


const args = parseArgs( {
    args: process.argv.slice( 2 ),
    allowPositionals: true,
    strict: false,
    options: {
        'source': { type: 'string' },
        'type': { type: 'string' },
        'category': { type: 'string' },
        'section': { type: 'string' },
        'page': { type: 'string' },
        'query': { type: 'string' },
        'scope': { type: 'string' },
        'help': { type: 'boolean', short: 'h' }
    }
} )

const { positionals, values } = args
const command = positionals[ 0 ]
const cwd = process.cwd()

const output = ( { result } ) => {
    process.stdout.write( JSON.stringify( result, null, 4 ) + '\n' )
}

const showHelp = () => {
    const helpText = `
   ______     __  __  ______
  / ____/__  / /_/ / / /  _/
 / / __/ _ \\/ __/ / / // /
/ /_/ /  __/ /_/ /_/ // /
\\____/\\___/\\__/\\____/___/

Usage: getui <command> [options]

Commands:
  init                Initialize local registry
  search              Search and filter components
  get                 Retrieve component code

Options (init):
  --source <path>     Path to source directory

Options (search):
  --type <string>     Filter by type
                      blocks, uikit
  --category <string> Filter by category
                      marketing, application-ui, ecommerce, catalyst
  --section <string>  Filter by section (required, use: getui search)
  --page <string>     Filter by component group (use: getui search)
  --query <string>    Free-text search across name, slug, id

Options (get):
  --scope <string>    Scope for light/dark mode
                      public (light), app (dark), admin (dark)

General:
  --help, -h          Show this help message

Examples:
  getui search                                        Browse full tree
  getui search --type uikit                           All UIKit components
  getui search --type blocks --category marketing     All marketing blocks
  getui search --category application-ui              All application UI
  getui search --section forms                        All form components
  getui search --section elements --page buttons      Only buttons
  getui search --query hero                           Search by name
  getui get catalyst--button --scope app              Get component code
  getui get catalyst--button --scope public            Get light mode code
  getui init --source ./output/2025-01-29T20-00-00    Init registry
`

    process.stdout.write( helpText )
}

const run = async () => {
    if( values[ 'help' ] || !command ) {
        showHelp()

        return
    }

    if( command === 'init' ) {
        const { source } = values
        const result = await GetUiCli.init( { source, cwd } )
        output( { result } )

        return
    }

    if( command === 'search' ) {
        const { type, category, section, page, query } = values
        const result = await GetUiCli.search( { type, category, section, page, query, cwd } )
        output( { result } )

        return
    }

    if( command === 'get' ) {
        const value = positionals[ 1 ]
        const { scope } = values
        const result = await GetUiCli.get( { value, scope, cwd } )
        output( { result } )

        return
    }

    showHelp()
}

run()
