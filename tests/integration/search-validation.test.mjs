import { describe, it, expect } from '@jest/globals'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

import { GetUiCli } from '../../src/GetUiCli.mjs'
import { PROJECT_CWD } from '../helpers/config.mjs'


const GLOBAL_CONFIG_PATH = join( homedir(), '.getui', 'config.json' )
const HAS_GLOBAL_CONFIG = existsSync( GLOBAL_CONFIG_PATH )
const describeIf = HAS_GLOBAL_CONFIG ? describe : describe.skip


describeIf( 'GetUiCli.search - filter validation', () => {
    it( 'returns error for unknown type', async () => {
        const result = await GetUiCli.search( {
            type: 'invalid', category: undefined, section: undefined,
            page: undefined, query: undefined, cwd: PROJECT_CWD
        } )

        expect( result['status'] ).toBe( false )
        expect( result['messages'] ).toBeDefined()
        expect( result['messages'][ 0 ] ).toContain( 'type: Unknown value "invalid"' )
        expect( result['messages'][ 0 ] ).toContain( 'Allowed:' )
    } )


    it( 'returns error for unknown category', async () => {
        const result = await GetUiCli.search( {
            type: undefined, category: 'invalid', section: undefined,
            page: undefined, query: undefined, cwd: PROJECT_CWD
        } )

        expect( result['status'] ).toBe( false )
        expect( result['messages'][ 0 ] ).toContain( 'category: Unknown value "invalid"' )
    } )


    it( 'returns error for unknown section', async () => {
        const result = await GetUiCli.search( {
            type: undefined, category: undefined, section: 'invalid',
            page: undefined, query: undefined, cwd: PROJECT_CWD
        } )

        expect( result['status'] ).toBe( false )
        expect( result['messages'][ 0 ] ).toContain( 'section: Unknown value "invalid"' )
    } )


    it( 'returns multiple errors for multiple invalid filters', async () => {
        const result = await GetUiCli.search( {
            type: 'invalid', category: 'invalid', section: 'invalid',
            page: undefined, query: undefined, cwd: PROJECT_CWD
        } )

        expect( result['status'] ).toBe( false )
        expect( result['messages'].length ).toBe( 3 )
    } )


    it( 'suggests closest match for type typo', async () => {
        const result = await GetUiCli.search( {
            type: 'blocs', category: undefined, section: undefined,
            page: undefined, query: undefined, cwd: PROJECT_CWD
        } )

        expect( result['status'] ).toBe( false )
        expect( result['messages'][ 0 ] ).toContain( 'Did you mean "blocks"?' )
    } )


    it( 'suggests closest match for category typo', async () => {
        const result = await GetUiCli.search( {
            type: undefined, category: 'marketng', section: undefined,
            page: undefined, query: undefined, cwd: PROJECT_CWD
        } )

        expect( result['status'] ).toBe( false )
        expect( result['messages'][ 0 ] ).toContain( 'Did you mean "marketing"?' )
    } )


    it( 'suggests closest match for section typo', async () => {
        const result = await GetUiCli.search( {
            type: undefined, category: undefined, section: 'froms',
            page: undefined, query: undefined, cwd: PROJECT_CWD
        } )

        expect( result['status'] ).toBe( false )
        expect( result['messages'][ 0 ] ).toContain( 'Did you mean "forms"?' )
    } )


    it( 'passes validation for valid type', async () => {
        const result = await GetUiCli.search( {
            type: 'blocks', category: undefined, section: undefined,
            page: undefined, query: undefined, cwd: PROJECT_CWD
        } )

        expect( result['status'] ).toBe( true )
        expect( result['total'] ).toBeGreaterThan( 0 )
    } )


    it( 'passes validation when no filters are provided', async () => {
        const result = await GetUiCli.search( {
            type: undefined, category: undefined, section: undefined,
            page: undefined, query: undefined, cwd: PROJECT_CWD
        } )

        expect( result['status'] ).toBe( true )
        expect( result['categories'] ).toBeDefined()
    } )


    it( 'does not validate query parameter', async () => {
        const result = await GetUiCli.search( {
            type: undefined, category: undefined, section: undefined,
            page: undefined, query: 'xyznonexistent', cwd: PROJECT_CWD
        } )

        expect( result['status'] ).toBe( true )
        expect( result['total'] ).toBe( 0 )
    } )
} )
