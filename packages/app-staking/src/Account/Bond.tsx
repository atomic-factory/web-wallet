// Copyright 2017-2019 @polkadot/ui-staking authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { I18nProps } from '@polkadot/ui-app/types';
import { ApiProps } from '@polkadot/ui-api/types';
import { CalculateBalanceProps } from '../types';

import BN from 'bn.js';
import React from 'react';
import { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import { Button, Dropdown, InputAddress, InputBalance, Modal, TxButton, TxComponent } from '@polkadot/ui-app';
import { withCalls, withApi, withMulti } from '@polkadot/ui-api';
import { calcSignatureLength } from '@polkadot/ui-signer/Checks';
import { ZERO_BALANCE, ZERO_FEES } from '@polkadot/ui-signer/Checks/constants';

import translate from '../translate';
import ValidateController from './ValidateController';
import { SubmittableResult } from '@polkadot/api/SubmittableExtrinsic';

type Props = I18nProps & ApiProps & CalculateBalanceProps & {
  accountId: string,
  controllerId?: string | null,
  isOpen: boolean,
  disableController?: boolean,
  onClose: () => void,
  onSuccess?:(status: SubmittableResult) => void,
  kton_locks: Array<any>,
  kton_freeBalance: BN,
  easyMode: boolean,
  checkSameController?: boolean,
  withStep?: boolean
};

type State = {
  bondValue?: BN,
  controllerError: string | null,
  controllerId: string,
  destination: number,
  extrinsic: SubmittableExtrinsic | null,
  maxBalance?: BN
};

const stashOptions = [
  // { text: 'Stash account (increase the amount at stake)', value: 0 },
  { text: 'Stash account (do not increase the amount at stake)', value: 1 },
  { text: 'Controller account', value: 2 }
];

const ZERO = new BN(0);
const noop = function(){};

class Bond extends TxComponent<Props, State> {
  state: State;

  constructor(props: Props) {
    super(props);

    const { accountId, controllerId } = this.props;

    this.state = {
      controllerError: null,
      controllerId: controllerId ? controllerId.toString() : accountId,
      destination: 1,
      extrinsic: null
    };
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { balances_fees } = this.props;
    const { controllerId, destination, extrinsic } = this.state;

    const hasLengthChanged = ((extrinsic && extrinsic.encodedLength) || 0) !== ((prevState.extrinsic && prevState.extrinsic.encodedLength) || 0);

    if ((controllerId && prevState.controllerId !== controllerId) ||
      (prevState.destination !== destination) ||
      (balances_fees !== prevProps.balances_fees) ||
      hasLengthChanged
    ) {
      this.setMaxBalance();
    }
  }

  render() {
    const { accountId, isOpen, onClose,onSuccess, t } = this.props;
    const { bondValue, controllerError, controllerId, extrinsic, maxBalance } = this.state;
    const hasValue = !!bondValue && bondValue.gtn(0) && (!maxBalance || bondValue.lte(maxBalance));
    const canSubmit = hasValue && !controllerError && !!controllerId;

    if (!isOpen) {
      return null;
    }

    return (
      <Modal
        className='staking--Bonding'
        dimmer='inverted'
        open
        size='small'
        onClose={onClose}
      >
        {this.renderContent()}
        <Modal.Actions>
          <Button.Group>
            <TxButton
              accountId={accountId}
              isDisabled={!canSubmit}
              isPrimary
              label={t('Bond')}
              onClick={onSuccess ? noop : onClose}
              onSuccess= {onSuccess}
              withSpinner={true}
              extrinsic={extrinsic}
              ref={this.button}
            />
            <Button
              isSecondary={true}
              isBasic={true}
              onClick={onClose}
              label={t('Cancel')}
            />
          </Button.Group>
        </Modal.Actions>
      </Modal>
    );
  }

  private renderContent() {
    const { accountId, t, disableController = false, easyMode = false, checkSameController = false, withStep } = this.props;
    const { controllerId, controllerError, bondValue, destination, maxBalance } = this.state;
    const hasValue = !!bondValue && bondValue.gtn(0);

    return (
      <>
        <Modal.Header className="ui-step-header">
          {t('Bond funds')}
          {withStep && <div>
            <span className="">STEP1</span>
            <i className="step"></i>
            <span className="step">STEP2</span>
            <i className="step"></i>
            <span className="step">STEP3</span>
          </div>}
        </Modal.Header>
        <Modal.Content className='ui--signer-Signer-Content'>
          <InputAddress
            className='medium'
            defaultValue={accountId}
            isDisabled
            label={t('stash account')}
          />

          {!easyMode && <InputAddress
            className='medium'
            help={t('The controller is the account that will be used to control any nominating or validating actions. Should not match another stash or controller.')}
            isError={!!controllerError}
            label={t('controller account')}
            onChange={this.onChangeController}
            isDisabled={disableController}
            type='account'
            value={controllerId}
          />}

          <ValidateController
            accountId={accountId}
            controllerId={controllerId}
            onError={this.onControllerError}
            checkSameController={checkSameController}
          />

          <InputBalance
            autoFocus
            className='medium'
            help={t('The total amount of the stash balance that will be at stake in any forthcoming rounds (should be less than the total amount available)')}
            isError={!hasValue}
            label={t('value bonded')}
            siValue={'kton'}
            maxValue={maxBalance}
            onChange={this.onChangeValue}
            onEnter={this.sendTx}
            withMax
          />
          {!easyMode && <Dropdown
            className='medium'
            defaultValue={1}
            help={t('The destination account for any payments as either a nominator or validator')}
            label={t('payment destination')}
            onChange={this.onChangeDestination}
            options={stashOptions}
            value={destination}
          />}
        </Modal.Content>
      </>
    );
  }

  private nextState(newState: Partial<State>): void {
    this.setState((prevState: State): State => {
      const { api } = this.props;
      const { bondValue = prevState.bondValue, controllerError = prevState.controllerError, controllerId = prevState.controllerId, destination = prevState.destination, maxBalance = prevState.maxBalance } = newState;
      const extrinsic = (bondValue && controllerId)
        ? api.tx.staking.bond(controllerId, bondValue, destination)
        : null;

      return {
        bondValue,
        controllerError,
        controllerId,
        destination,
        extrinsic,
        maxBalance
      };
    });
  }

  private setMaxBalance = () => {
    const { api, system_accountNonce = ZERO, balances_fees = ZERO_FEES, balances_all = ZERO_BALANCE, kton_locks, kton_freeBalance = ZERO } = this.props;
    const { controllerId, destination } = this.state;

    const { transactionBaseFee, transactionByteFee } = balances_fees;
    const { freeBalance } = balances_all;

    let prevMax = new BN(0);
    let maxBalance = new BN(1);
    let extrinsic;

    while (!prevMax.eq(maxBalance)) {
      prevMax = maxBalance;

      extrinsic = controllerId && destination
        ? api.tx.staking.bond(controllerId, prevMax, destination)
        : null;

      const txLength = calcSignatureLength(extrinsic, system_accountNonce);

      const fees = transactionBaseFee
        .add(transactionByteFee.muln(txLength));


        debugger
      let _ktonBalances_locks = new BN(0)

      if (kton_locks) {
        kton_locks.forEach((item) => {
          _ktonBalances_locks = _ktonBalances_locks.add(item.amount)
        })
      }
      maxBalance = kton_freeBalance.sub(_ktonBalances_locks);
    }

    this.nextState({
      extrinsic,
      maxBalance
    });
  }

  private onChangeController = (controllerId: string) => {
    this.nextState({ controllerId });
  }

  private onChangeDestination = (destination: number) => {
    this.nextState({ destination });
  }

  private onChangeValue = (bondValue?: BN) => {
    this.nextState({ bondValue });
  }

  private onControllerError = (controllerError: string | null) => {
    this.setState({ controllerError });
  }
}

export default withMulti(
  Bond,
  translate,
  withApi,
  withCalls<Props>(
    'derive.balances.fees',
    ['derive.balances.all', { paramName: 'accountId' }],
    ['query.system.accountNonce', { paramName: 'accountId' }],
    ['query.kton.locks', { paramName: 'accountId' }],
    ['query.kton.freeBalance', { paramName: 'accountId' }]
  )
);
