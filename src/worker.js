import BASE from './lex.json';
import { handle } from './api.js';

export default {
  fetch(request, env) { return handle(request, env, BASE); },
};
