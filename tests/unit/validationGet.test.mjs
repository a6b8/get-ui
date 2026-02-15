import { describe, it, expect } from '@jest/globals'

import { GetUiCli } from '../../src/GetUiCli.mjs'
import { VALID_SCOPES } from '../helpers/config.mjs'


describe( 'GetUiCli.validationGet', () => {
    it( 'returns error when value is undefined', () => {
        const result = GetUiCli.validationGet( {
            value: undefined, scope: 'app', scopes: VALID_SCOPES
        } )

        expect( result['status'] ).toBe( false )
        expect( result['error'] ).toBe( 'id or hash: Missing value' )
    } )


    it( 'returns error when scope is undefined', () => {
        const result = GetUiCli.validationGet( {
            value: 'some-id', scope: undefined, scopes: VALID_SCOPES
        } )

        expect( result['status'] ).toBe( false )
        expect( result['error'] ).toContain( 'scope: Missing value' )
    } )


    it( 'returns error for unknown scope', () => {
        const result = GetUiCli.validationGet( {
            value: 'some-id', scope: 'unknown', scopes: VALID_SCOPES
        } )

        expect( result['status'] ).toBe( false )
        expect( result['error'] ).toContain( 'Unknown scope "unknown"' )
    } )


    it( 'returns status true for valid value and scope', () => {
        const result = GetUiCli.validationGet( {
            value: 'some-id', scope: 'app', scopes: VALID_SCOPES
        } )

        expect( result['status'] ).toBe( true )
        expect( result['error'] ).toBeNull()
    } )


    it( 'lists available scopes in error message', () => {
        const result = GetUiCli.validationGet( {
            value: 'some-id', scope: undefined, scopes: VALID_SCOPES
        } )

        expect( result['error'] ).toContain( 'public' )
        expect( result['error'] ).toContain( 'app' )
        expect( result['error'] ).toContain( 'admin' )
    } )
} )
