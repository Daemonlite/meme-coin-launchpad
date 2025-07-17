const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Factory", function () {
  const FEE = ethers.parseUnits("0.01", 18);

  async function deployFactoryFixture() {
    //fetch accounts
    const [deployer, creator, buyer] = await ethers.getSigners();

    //fetch the contract
    const Factory = await ethers.getContractFactory("Factory");
    // deploy the contract
    const factory = await Factory.deploy(FEE);

    //create token
    const transaction = await factory
      .connect(creator)
      .create("Daemon", "DML", { value: FEE });

    //get token address
    const tokenAddress = await factory.tokens(0);
    const token = await ethers.getContractAt("Token", tokenAddress);

    await transaction.wait();

    return { factory, token, deployer, creator, buyer };
  }

  async function buyTokenFixture() {
    const { factory, token, creator, buyer } = await deployFactoryFixture();

    const AMOUNT = ethers.parseUnits("10000", 18);
    const COST = ethers.parseUnits("1", 18);

    //buy tokens
    const transaction = await factory
      .connect(buyer)
      .buy(await token.getAddress(), AMOUNT, { value: COST });
    await transaction.wait();

    return { factory, token, creator, buyer };
  }

  describe("Deployment", function () {
    it("Should set the right fee", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);
      expect(await factory.fee()).to.equal(FEE);
    });

    it("it should set the owner", async function () {
      const { factory, deployer } = await loadFixture(deployFactoryFixture);
      expect(await factory.owner()).to.equal(deployer.address);
    });
  });

  describe("Creating", function () {
    it("Should set the owner", async function () {
      const { factory, token } = await loadFixture(deployFactoryFixture);
      expect(await token.owner()).to.equal(await factory.getAddress());
    });

    it("Should set the creator", async function () {
      const { token, creator } = await loadFixture(deployFactoryFixture);
      expect(await token.creator()).to.equal(creator.address);
    });

    it("Should set the supply", async function () {
      const { factory, token } = await loadFixture(deployFactoryFixture);

      const totalSupply = await ethers.parseUnits("1000000", 18);

      expect(await token.balanceOf(await factory.getAddress())).to.equal(
        totalSupply
      );
    });

    it("Should update ETH balance", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);
      const balance = await ethers.provider.getBalance(factory.getAddress());
      expect(balance).to.equal(FEE);
    });

    it("Should create the sale", async function () {
      const { factory, token, creator } = await loadFixture(
        deployFactoryFixture
      );

      const count = await factory.totalTokens();

      expect(count).to.equal(1);

      const sale = await factory.getTokenSale(0);

      expect(sale.token).to.equal(await token.getAddress());
      expect(sale.creator).to.equal(creator.address);
      expect(sale.sold).to.equal(0);
      expect(sale.raised).to.equal(0);
      expect(sale.isOpen).to.equal(true);
    });
  });

  describe("Buying", function () {
    const AMOUNT = ethers.parseUnits("10000", 18);
    const COST = ethers.parseUnits("1", 18);

    //check if contract received ETH
    it("Should update ETH balance", async function () {
      const { factory } = await loadFixture(buyTokenFixture);

      const balance = await ethers.provider.getBalance(
        await factory.getAddress()
      );

      expect(balance).to.equal(FEE + COST);
    });

    //check that the buyer received tokens
    it("Should Update token balance", async function () {
      const { token, buyer } = await loadFixture(buyTokenFixture);

      const balance = await token.balanceOf(buyer.address);

      expect(balance).to.equal(AMOUNT);
    });

    it("Should update the token sale", async function () {
      const { factory, token } = await loadFixture(buyTokenFixture);

      const sale = await factory.tokenToSale(await token.getAddress());
      //const cost = await  factory.getCost(sale.sold)

      expect(sale.sold).to.equal(AMOUNT);
      expect(sale.raised).to.equal(COST);
      expect(sale.isOpen).to.equal(true);
    });

    it("Should increase base cost", async function () {
        const { factory, token } = await loadFixture(buyTokenFixture);

        const sale = await factory.tokenToSale(await token.getAddress());
        const cost = await factory.getCost(sale.sold);

       expect(cost).to.equal(ethers.parseUnits("0.0011", 18));

    })
  });

  describe("Depositing", function () {
  const AMOUNT = ethers.parseUnits("10000", 18);

  it("Sale should be closed and successfully deposits", async function () {
    const { factory, token, creator, buyer } = await loadFixture(buyTokenFixture);

    // Calculate new cost based on sold tokens (after 10,000 sold)
    const cost = await factory.getCost(ethers.parseUnits("10000", 18));
    const secondBuyCost = (cost * AMOUNT) / ethers.parseUnits("1", 18);

    // Buy tokens again to close the sale
    const buyTx = await factory.connect(buyer).buy(
      await token.getAddress(),
      AMOUNT,
      { value: secondBuyCost }
    );
    await buyTx.wait();

    const sale = await factory.tokenToSale(await token.getAddress());
    expect(sale.isOpen).to.equal(false);

    const depositTx = await factory.connect(creator).deposit(await token.getAddress());
    await depositTx.wait();

    const remaining = ethers.parseUnits("980000", 18); // 1_000_000 - 2 * 10_000

    const balance = await token.balanceOf(creator.address);
    expect(balance).to.equal(remaining);
  });
});


  describe("Withdrawing Fees", function () {
  it("Should update ETH balances", async function () {
    const { factory, deployer } = await loadFixture(deployFactoryFixture);

    const transaction = await factory.connect(deployer).withdraw(FEE);
    await transaction.wait();

    const balance = await ethers.provider.getBalance(factory.getAddress());
    expect(balance).to.equal(0);
  });
});

});
