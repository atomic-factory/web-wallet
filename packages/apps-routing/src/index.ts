// Copyright 2017-2019 @polkadot/apps-routing authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { Routing, Routes } from './types';

import appSettings from '@polkadot/ui-settings';

import template from './123code';
import accounts from './accounts';
import addressbook from './addressbook';
import contracts from './contracts';
import dashboard from './dashboard';
import democracy from './democracy';
import explorer from './explorer';
import extrinsics from './extrinsics';
import js from './js';
import settings from './settings';
import staking from './staking';
import storage from './storage';
import sudo from './sudo';
import toolbox from './toolbox';
import transfer from './transfer';

const routes: Routes = appSettings.uiMode === 'light'
  ? ([] as Routes).concat(
    // dashboard,
    // explorer,
    staking,
    democracy,
    null,
    accounts,
    addressbook,
    // transfer,
    null,
    settings,
    template
  )
  : ([] as Routes).concat(
    // dashboard,
    // explorer,
    staking,
    democracy,
    null,
    accounts,
    addressbook,
    // transfer,
    null,
    contracts,
    storage,
    extrinsics,
    sudo,
    null,
    settings,
    toolbox,
    // js,
    template
  );

export default ({
  default: 'accounts',
  routes
} as Routing);
