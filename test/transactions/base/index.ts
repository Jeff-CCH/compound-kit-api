import baseTokensJSON from './base.json';
import * as common from '@protocolink/common';

type baseTokenSymbols = keyof typeof baseTokensJSON;

export const baseTokens = common.toTokenMap<baseTokenSymbols>(baseTokensJSON);
