import { SearchCore } from '@/lib/searchCore';
import * as Comlink from 'comlink';

Comlink.expose(SearchCore.create);