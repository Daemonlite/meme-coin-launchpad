// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("hardhat");

const FEE = ethers.parseUnits("0.01", 18);

module.exports = buildModule("FactoryModule", (m) => {
    // fetch the contract
    const fee = m.getParameter("fee", FEE);

    // deploy the contract
    const factory = m.contract("Factory",[fee])

    //Return the contract
    return {factory}
})
