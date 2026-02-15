import { describe, it, expect } from '@jest/globals'

import { GetUiCli } from '../../src/GetUiCli.mjs'


describe( 'GetUiCli.validationInit', () => {
    it( 'returns error when source is undefined', () => {
        const result = GetUiCli.validationInit( { source: undefined } )

        expect( result['status'] ).toBe( false )
        expect( result['error'] ).toBe( '--source is required. Provide path to a run directory' )
    } )


    it( 'returns status true when source is provided', () => {
        const result = GetUiCli.validationInit( { source: '/some/path' } )

        expect( result['status'] ).toBe( true )
        expect( result['error'] ).toBeNull()
    } )
} )
