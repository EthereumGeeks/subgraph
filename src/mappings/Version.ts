import { NewFund } from "../types/VersionDataSource/VersionContract";
import { HubDataSource } from "../types/VersionDataSource/templates";
import { Fund, FundCount, State } from "../types/schema";
import { hexToAscii } from "./utils/hexToAscii";
import { HubContract } from "../types/VersionDataSource/HubContract";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleNewFund(event: NewFund): void {
  HubDataSource.create(event.params.hub);

  let hub = event.params.hub.toHex();
  let addresses = event.params.routes.map<string>(value => value.toHex());
  let contract = HubContract.bind(event.params.hub);
  let fund = new Fund(hub);
  fund.manager = event.params.manager.toHex();
  fund.name = hexToAscii(contract.name());
  fund.creationTime = contract.creationTime();
  fund.isShutdown = contract.isShutDown();
  fund.accounting = addresses[0];
  fund.feeManager = addresses[1];
  fund.participation = addresses[2];
  fund.policyManager = addresses[3];
  fund.shares = addresses[4];
  fund.trading = addresses[5];
  fund.vault = addresses[6];
  fund.registry = addresses[8];
  fund.version = addresses[9];
  fund.engine = addresses[10];
  fund.save();

  // update fund counts
  let state = State.load("0x");
  if (!state) {
    state = new State("0x");
    state.activeFunds = BigInt.fromI32(0);
    state.nonActiveFunds = BigInt.fromI32(0);
    state.timestampFundCount = BigInt.fromI32(0);
    state.lastCalculation = BigInt.fromI32(0);
  }

  let fundCount = new FundCount(event.transaction.hash.toHex());
  if (fund.isShutdown) {
    fundCount.active = state.activeFunds;
    fundCount.nonActive = state.nonActiveFunds.plus(BigInt.fromI32(1));
  } else {
    fundCount.active = state.activeFunds.plus(BigInt.fromI32(1));
    fundCount.nonActive = state.nonActiveFunds;
  }
  fundCount.timestamp = event.block.timestamp;
  fundCount.save();

  state.activeFunds = fundCount.active;
  state.nonActiveFunds = fundCount.nonActive;
  state.timestampFundCount = event.block.timestamp;
  state.save();
}
