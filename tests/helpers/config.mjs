import { join } from 'node:path'


const PROJECT_CWD = join( import.meta.dirname, '..', '..' )

const VALID_SCOPES = {
    'public': { 'mode': 'light' },
    'app': { 'mode': 'dark' },
    'admin': { 'mode': 'dark' }
}


export { PROJECT_CWD, VALID_SCOPES }
