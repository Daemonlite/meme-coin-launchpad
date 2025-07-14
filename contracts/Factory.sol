// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import { Token} from "./Token.sol";

contract Factory {
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

    constructor(uint256 _fee) {
        fee = _fee;
        owner = msg.sender;
    }

    function getTokenSale(uint256 _index) public view returns (TokenSale memory) {
        return tokenToSale[tokens[_index]];
    }

    function create (string memory _name, string memory _symbol) external payable {
        //make sure that the fee is correct
        require(msg.value >= fee,"Factory: Fee not correct");

        //create a  new token 
        Token token = new Token(msg.sender,_name, _symbol,1_000_000 ether);

        //save the token for later use
        tokens.push(address(token));
        totalTokens++;

        // list the token for sale
        TokenSale memory sale = TokenSale(address(token),_name,msg.sender,0,0,true);

        tokenToSale[address(token)] = sale;


        // tell people that the token is live

        emit Created(address(token));

    }
}
