import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'


class GetUiCli {
    static async init( { source, cwd } ) {
        const { status, error } = GetUiCli.validationInit( { source } )
        if( !status ) {
            return GetUiCli.#error( { error } )
        }

        const resolvedSource = resolve( source )
        const overviewPath = join( resolvedSource, 'overview.json' )
        const { data: overview } = await GetUiCli.#readJson( { filePath: overviewPath } )

        if( !overview ) {
            return GetUiCli.#error( { error: 'overview.json not found in source directory' } )
        }

        const { timestamp, total } = overview
        const targetDir = GetUiCli.#blocksDir( { active: timestamp } )
        await mkdir( targetDir, { recursive: true } )

        const targetOverviewPath = join( targetDir, 'overview.json' )
        await copyFile( overviewPath, targetOverviewPath )

        const dataDir = join( resolvedSource, '1-data' )
        const files = await readdir( dataDir )
        const jsonFiles = files
            .filter( ( file ) => {
                const isJson = file.endsWith( '.json' )

                return isJson
            } )

        await Promise.all(
            jsonFiles
                .map( ( file ) => {
                    const srcPath = join( dataDir, file )
                    const destPath = join( targetDir, file )

                    return copyFile( srcPath, destPath )
                } )
        )

        const globalConfigPath = join( GetUiCli.#getuiDir(), 'config.json' )
        const { data: existingConfig } = await GetUiCli.#readJson( { filePath: globalConfigPath } )

        const globalConfig = {
            'active': {
                'blocks': timestamp,
                'uikit': existingConfig ? existingConfig['active']['uikit'] : null
            },
            'scopes': existingConfig ? existingConfig['scopes'] : {
                'public': { 'mode': 'light' },
                'app': { 'mode': 'dark' },
                'admin': { 'mode': 'dark' }
            }
        }
        await writeFile( globalConfigPath, JSON.stringify( globalConfig, null, 4 ), 'utf-8' )

        const localConfigDir = join( cwd, '.getui' )
        await mkdir( localConfigDir, { recursive: true } )

        const localConfigPath = join( localConfigDir, 'config.json' )
        const localConfig = {
            'root': '~/.getui',
            'scope': 'app'
        }
        await writeFile( localConfigPath, JSON.stringify( localConfig, null, 4 ), 'utf-8' )

        const result = {
            'status': true,
            'message': `Initialized ~/.getui with ${total} blocks`,
            'source': resolvedSource,
            'total': total
        }

        return result
    }


    static async search( { type, category, section, page, query, cwd } ) {
        const { config, error: configError } = await GetUiCli.#loadConfig( { cwd } )
        if( !config ) {
            return GetUiCli.#error( { error: configError } )
        }

        const { allComponents, error: loadError } = await GetUiCli.#loadAllOverviews( { config } )
        if( !allComponents ) {
            return GetUiCli.#error( { error: loadError } )
        }

        const { status: filterStatus, messages } = GetUiCli.#validateSearchFilters( {
            allComponents, type, category, section
        } )

        if( !filterStatus ) {
            return { 'status': false, 'messages': messages }
        }

        const hasFilter = type !== undefined || category !== undefined || section !== undefined || page !== undefined || query !== undefined

        if( !hasFilter ) {
            const { tree } = GetUiCli.#buildTree( { components: allComponents } )

            const result = {
                'status': true,
                'total': allComponents.length,
                'categories': tree
            }

            return result
        }

        const { filtered } = GetUiCli.#filterComponents( {
            components: allComponents,
            type,
            category,
            section,
            page,
            query
        } )

        const cleanComponents = filtered
            .map( ( component ) => {
                const { type: cType, id, name, slug, category, section, page, hash, library, assets } = component
                const clean = { 'type': cType, id, name }

                if( slug !== undefined ) { clean['slug'] = slug }
                clean['category'] = category
                clean['section'] = section
                clean['page'] = page
                if( hash !== undefined ) { clean['hash'] = hash }
                if( library !== undefined ) { clean['library'] = library }
                if( assets !== undefined ) { clean['assets'] = assets }

                return clean
            } )

        const result = {
            'status': true,
            'total': filtered.length,
            'filters': {
                'type': type || null,
                'category': category || null,
                'section': section || null,
                'page': page || null,
                'query': query || null
            },
            'components': cleanComponents
        }

        return result
    }


    static async get( { value, scope, cwd } ) {
        const { config, error: configError } = await GetUiCli.#loadConfig( { cwd } )
        if( !config ) {
            return GetUiCli.#error( { error: configError } )
        }

        const { scopes } = config
        const { status, error } = GetUiCli.validationGet( { value, scope, scopes } )
        if( !status ) {
            return GetUiCli.#error( { error } )
        }

        const mode = scopes[ scope ]['mode']

        const { allComponents, error: loadError } = await GetUiCli.#loadAllOverviews( { config } )
        if( !allComponents ) {
            return GetUiCli.#error( { error: loadError } )
        }

        const isHash = /^[a-f0-9]{32}$/.test( value )
        const entry = allComponents
            .find( ( component ) => {
                if( isHash ) {
                    const matchesHash = component['hash'] === value

                    return matchesHash
                }

                const matchesId = component['id'] === value

                return matchesId
            } )

        if( !entry ) {
            return GetUiCli.#error( { error: `Component not found: ${value}` } )
        }

        const { type: componentType } = entry

        if( componentType === 'uikit' ) {
            const { id, name, category, section, page, library, assets } = entry
            const { partial } = assets
            const partialPath = join( GetUiCli.#getuiDir(), 'uikit', library, 'partials', partial )
            const { data: partialContent } = await GetUiCli.#readText( { filePath: partialPath } )

            if( !partialContent ) {
                return GetUiCli.#error( { error: `Could not read partial: ${partial}` } )
            }

            const result = {
                'status': true,
                'type': 'uikit',
                id,
                name,
                scope,
                mode,
                category,
                section,
                page,
                library,
                assets,
                'code': partialContent
            }

            return result
        }

        const { filename, id, name, category, section, page, hash } = entry
        const { active } = config
        const activeBlocksTimestamp = active['blocks']
        const activeDir = GetUiCli.#blocksDir( { active: activeBlocksTimestamp } )
        const componentPath = join( activeDir, filename )
        const { data: componentData } = await GetUiCli.#readJson( { filePath: componentPath } )

        if( !componentData ) {
            return GetUiCli.#error( { error: `Could not read component file: ${filename}` } )
        }

        const code = componentData['code'][ mode ] || null

        if( !code ) {
            return GetUiCli.#error( { error: `Mode "${mode}" not available for component: ${id}` } )
        }

        const result = {
            'status': true,
            'type': 'blocks',
            id,
            name,
            scope,
            mode,
            category,
            section,
            page,
            hash,
            code
        }

        return result
    }


    static validationInit( { source } ) {
        const struct = { 'status': false, 'error': null }

        if( source === undefined ) {
            struct['error'] = '--source is required. Provide path to a run directory'

            return struct
        }

        struct['status'] = true

        return struct
    }


    static validationGet( { value, scope, scopes } ) {
        const struct = { 'status': false, 'error': null }

        if( value === undefined ) {
            struct['error'] = 'id or hash: Missing value'

            return struct
        }

        const scopeNames = Object.keys( scopes )

        if( scope === undefined ) {
            struct['error'] = `scope: Missing value. Available scopes: ${scopeNames.join( ', ' )}`

            return struct
        }

        if( !scopeNames.includes( scope ) ) {
            struct['error'] = `scope: Unknown scope "${scope}". Available scopes: ${scopeNames.join( ', ' )}`

            return struct
        }

        struct['status'] = true

        return struct
    }


    static async #loadConfig( { cwd } ) {
        const globalConfigPath = join( GetUiCli.#getuiDir(), 'config.json' )
        const { data: globalConfig } = await GetUiCli.#readJson( { filePath: globalConfigPath } )

        if( !globalConfig ) {
            return { 'config': null, 'error': 'Not initialized. Run: getui init --source <path>' }
        }

        const localConfigPath = join( cwd, '.getui', 'config.json' )
        const { data: localConfig } = await GetUiCli.#readJson( { filePath: localConfigPath } )

        const { active, scopes } = globalConfig
        const config = {
            active,
            scopes,
            'local': localConfig || null
        }

        return { 'config': config, 'error': null }
    }


    static async #loadAllOverviews( { config } ) {
        const { active } = config
        const allComponents = []

        const blocksTimestamp = active['blocks']
        if( blocksTimestamp ) {
            const blocksDir = GetUiCli.#blocksDir( { active: blocksTimestamp } )
            const blocksOverviewPath = join( blocksDir, 'overview.json' )
            const { data: blocksOverview } = await GetUiCli.#readJson( { filePath: blocksOverviewPath } )

            if( blocksOverview ) {
                blocksOverview['components']
                    .forEach( ( component ) => {
                        allComponents.push( component )
                    } )
            }
        }

        const uikitConfig = active['uikit']
        if( uikitConfig ) {
            const libraries = Object.keys( uikitConfig )
            await Promise.all(
                libraries
                    .map( async ( library ) => {
                        const uikitOverviewPath = join( GetUiCli.#getuiDir(), 'uikit', library, 'overview.json' )
                        const { data: uikitOverview } = await GetUiCli.#readJson( { filePath: uikitOverviewPath } )

                        if( uikitOverview ) {
                            uikitOverview['components']
                                .forEach( ( component ) => {
                                    allComponents.push( component )
                                } )
                        }
                    } )
            )
        }

        if( allComponents.length === 0 ) {
            return { 'allComponents': null, 'error': 'No components found. Run: getui init --source <path>' }
        }

        return { allComponents, 'error': null }
    }


    static #getuiDir() {
        const dir = join( homedir(), '.getui' )

        return dir
    }


    static #blocksDir( { active } ) {
        const dir = join( GetUiCli.#getuiDir(), 'blocks', active )

        return dir
    }


    static async #readJson( { filePath } ) {
        try {
            const content = await readFile( filePath, 'utf-8' )
            const data = JSON.parse( content )

            return { data }
        } catch {
            return { 'data': null }
        }
    }


    static async #readText( { filePath } ) {
        try {
            const data = await readFile( filePath, 'utf-8' )

            return { data }
        } catch {
            return { 'data': null }
        }
    }


    static #error( { error } ) {
        const result = { 'status': false, error }

        return result
    }


    static #buildTree( { components } ) {
        const categoryMap = new Map()

        components
            .forEach( ( { category, section, page } ) => {
                if( !categoryMap.has( category ) ) {
                    categoryMap.set( category, new Map() )
                }

                const sectionMap = categoryMap.get( category )

                if( !sectionMap.has( section ) ) {
                    sectionMap.set( section, new Map() )
                }

                const pageMap = sectionMap.get( section )
                const current = pageMap.get( page ) || 0
                pageMap.set( page, current + 1 )
            } )

        const tree = [ ...categoryMap.entries() ]
            .map( ( [ categoryName, sectionMap ] ) => {
                const sections = [ ...sectionMap.entries() ]
                    .map( ( [ sectionName, pageMap ] ) => {
                        const pages = [ ...pageMap.entries() ]
                            .map( ( [ pageName, count ] ) => {
                                const pageEntry = { 'name': pageName, count }

                                return pageEntry
                            } )

                        const sectionCount = pages
                            .reduce( ( sum, { count } ) => {
                                const total = sum + count

                                return total
                            }, 0 )

                        const sectionEntry = { 'name': sectionName, 'count': sectionCount, pages }

                        return sectionEntry
                    } )

                const categoryCount = sections
                    .reduce( ( sum, { count } ) => {
                        const total = sum + count

                        return total
                    }, 0 )

                const categoryEntry = { 'name': categoryName, 'count': categoryCount, sections }

                return categoryEntry
            } )

        return { tree }
    }


    static #filterComponents( { components, type, category, section, page, query } ) {
        const filtered = components
            .filter( ( component ) => {
                const matchType = type === undefined || component['type'] === type
                const matchCategory = category === undefined || component['category'] === category
                const matchSection = section === undefined || component['section'] === section
                const matchPage = page === undefined || component['page'] === page
                const matchQuery = query === undefined || GetUiCli.#matchesQuery( { component, query } )
                const matches = matchType && matchCategory && matchSection && matchPage && matchQuery

                return matches
            } )

        return { filtered }
    }


    static #matchesQuery( { component, query } ) {
        const lowerQuery = query.toLowerCase()
        const { name, slug, id } = component
        const searchFields = [ name, slug, id ]
            .filter( ( field ) => {
                const exists = field !== undefined

                return exists
            } )

        const matches = searchFields
            .some( ( field ) => {
                const contains = field.toLowerCase().includes( lowerQuery )

                return contains
            } )

        return matches
    }


    static #levenshtein( { a, b } ) {
        const matrix = Array.from( { length: b.length + 1 }, ( _, i ) => {
            return Array.from( { length: a.length + 1 }, ( _, j ) => {
                if( i === 0 ) { return j }
                if( j === 0 ) { return i }

                return 0
            } )
        } )

        Array.from( { length: b.length }, ( _, i ) => {
            Array.from( { length: a.length }, ( _, j ) => {
                const cost = b[ i ] === a[ j ] ? 0 : 1
                matrix[ i + 1 ][ j + 1 ] = Math.min(
                    matrix[ i ][ j + 1 ] + 1,
                    matrix[ i + 1 ][ j ] + 1,
                    matrix[ i ][ j ] + cost
                )
            } )
        } )

        const distance = matrix[ b.length ][ a.length ]

        return { distance }
    }


    static #findClosest( { input, allowed } ) {
        let closest = null
        let minDistance = 4

        allowed
            .forEach( ( candidate ) => {
                const { distance } = GetUiCli.#levenshtein( { a: input.toLowerCase(), b: candidate.toLowerCase() } )

                if( distance < minDistance ) {
                    minDistance = distance
                    closest = candidate
                }
            } )

        return { closest }
    }


    static #validateSearchFilters( { allComponents, type, category, section } ) {
        const messages = []

        if( type !== undefined ) {
            const allowedTypes = [ ...new Set( allComponents.map( ( c ) => c['type'] ) ) ]
            if( !allowedTypes.includes( type ) ) {
                const { closest } = GetUiCli.#findClosest( { input: type, allowed: allowedTypes } )
                const hint = closest ? ` Did you mean "${closest}"?` : ''
                messages.push( `type: Unknown value "${type}". Allowed: ${allowedTypes.join( ', ' )}${hint}` )
            }
        }

        if( category !== undefined ) {
            const allowedCategories = [ ...new Set( allComponents.map( ( c ) => c['category'] ) ) ]
            if( !allowedCategories.includes( category ) ) {
                const { closest } = GetUiCli.#findClosest( { input: category, allowed: allowedCategories } )
                const hint = closest ? ` Did you mean "${closest}"?` : ''
                messages.push( `category: Unknown value "${category}". Allowed: ${allowedCategories.join( ', ' )}${hint}` )
            }
        }

        if( section !== undefined ) {
            const allowedSections = [ ...new Set( allComponents.map( ( c ) => c['section'] ) ) ]
            if( !allowedSections.includes( section ) ) {
                const { closest } = GetUiCli.#findClosest( { input: section, allowed: allowedSections } )
                const hint = closest ? ` Did you mean "${closest}"?` : ''
                messages.push( `section: Unknown value "${section}". Allowed: ${allowedSections.join( ', ' )}${hint}` )
            }
        }

        if( messages.length > 0 ) {
            return { 'status': false, messages }
        }

        return { 'status': true, 'messages': [] }
    }
}


export { GetUiCli }
