// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Token} from "./Token.sol";

contract Factory {
    uint256 public constant TARGET = 3 ether;
    uint256 public constant TOKEN_LIMIT = 500_100 ether;
    uint public immutable fee;
    address public owner;
    address[] public tokens;
    // this mapping is used to store the token sales
    mapping(address => TokenSale) public tokenToSale;

    struct TokenSale {
        address token;
        string name;
        address creator;
        uint256 sold;
        uint256 raised;
        bool isOpen;
    }

    uint256 public totalTokens;

    event Created(address indexed token);
    event Buy(address indexed token, uint256 amount);

    constructor(uint256 _fee) {
        fee = _fee;
        owner = msg.sender;
    }

    // with this function we can get the cost of the token which fluctuates
    // based on the amount of tokens sold
    function getCost(uint256 _sold) public pure returns (uint256) {
        uint256 floor = 0.0001 ether;
        uint256 step = 0.0001 ether;
        uint256 increment = 1000 ether;

        uint256 cost = (step * (_sold / increment)) + floor;

        return cost;
    }

    function getTokenSale(
        uint256 _index
    ) public view returns (TokenSale memory) {
        return tokenToSale[tokens[_index]];
    }

    function create(
        string memory _name,
        string memory _symbol
    ) external payable {
        //make sure that the fee is correct
        require(msg.value >= fee, "Factory: Fee not correct");

        //create a  new token
        Token token = new Token(msg.sender, _name, _symbol, 1_000_000 ether);

        //save the token for later use
        tokens.push(address(token));
        totalTokens++;

        // list the token for sale
        TokenSale memory sale = TokenSale(
            address(token),
            _name,
            msg.sender,
            0,
            0,
            true
        );

        tokenToSale[address(token)] = sale;

        // tell people that the token is live

        emit Created(address(token));
    }

    function buy(address _token, uint256 _amount) external payable {
        TokenSale storage sale = tokenToSale[_token];
        // check conditions
        require(sale.isOpen == true, "Factory: Token sale is closed");
        require(_amount >= 1 ether, "Factory: Amount is too low");
        require(_amount <= 100000 ether, "Factory: Amount is too high");

        // Calculate the price of 1 token based on total bought
        uint256 cost = getCost(sale.sold);

        uint256 price = (cost * _amount) / 1 ether; // Fix price precision;

        // make sure enough eth is sent
        require(msg.value >= price, "Factory: Not enough ETH receieved");

        //update the sale
        sale.sold += _amount;
        sale.raised += price;

        //Make sure the fund raising goal isnt met

        if (sale.sold >= TOKEN_LIMIT || sale.raised >= TARGET) {
            sale.isOpen = false;
        }

        Token(_token).transfer(msg.sender, _amount);

        //emit an event
        emit Buy(_token, _amount);
    }

    function deposit(address _token) external {
        // the remaining token balance and ETH
        //would go into a liquidity pool like Uniswap V3
        //For simplicity we will just send it to the owner

        Token token = Token(_token);
        TokenSale memory sale = tokenToSale[_token];

        require(sale.isOpen == false, "Factory: Target not reached");

        //transfer tokens to the owner
        token.transfer(sale.creator, token.balanceOf(address(this)));

        //transfer ETH raised
        (bool success, ) = payable(sale.creator).call{value: sale.raised}("");

        require(success, "Factory: ETH Transfer failed");
    }

    function withdraw(uint256 _amount) external {
        require(msg.sender == owner, "Factory: Only the owner can withdraw");

        (bool success, ) = payable(owner).call{value: _amount}("");

        require(success, "Factory: ETH Transfer failed");
    }
}
