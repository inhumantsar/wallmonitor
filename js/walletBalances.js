var totalEth = new BigNumber(0);

var truncateString = function(str, length) {
  // https://stackoverflow.com/a/20608147/596204
  return str.length > length ? str.substring(0, length - 3) + '...' : str
}


function formatCurrency(total) {
  // https://stackoverflow.com/a/23747933/596204
  var neg = false;
  if(total < 0) {
    neg = true;
    total = Math.abs(total);
  }
  return (neg ? "-$" : '$') + parseFloat(total, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
}

var roundTo = function (n, digits) {
  // from https://stackoverflow.com/questions/10015027/javascript-tofixed-not-rounding/32605063#32605063
  if (digits === undefined) {
    digits = 0;
  }

  var multiplicator = Math.pow(10, digits);
  n = parseFloat((n * multiplicator).toFixed(11));
  return Math.round(n) / multiplicator;
}

var getEthPrice = function(minor, totalSelector, priceSelector, type='last') {
  console.log('(getEthPrice) got minor currency: '+minor);
  url='https://api.coinbase.com/v2/exchange-rates?currency=ETH';
  $.get(url,function(data, status, jqxhr){
    rate = data['data']['rates'][minor.toUpperCase()];
    // console.log('(exchange) data:'+data);
    if(rate) {
      updateExchangeTotal(minor, rate, totalSelector, priceSelector);
    } else {
      console.log('(getEthPrice) rates not found: '+data['currency']);
      console.log('(getEthPrice) status returned: '+status);
    }
  });
}

// get metamask + other account balances
var logEthBalance = function(address, balance, ethSelector){
  console.log('(logEthBalance) ' + address + ": " + balance);
  var id = 'eth-balances-'+address;
  // check to see if this has already been added
  if($('#'+id).length > 0) { return; }

  // generate html
  var html = `<div class="card balance-card">
    <div class="card-header">
      <img class="balance-card-logo" src="img/logo-eth.svg" />
      <h5>
        `+roundTo(balance, 12)+` &#926;
      </h5>
    </div>
    <div class="card-body">
      <div class="balance-card-details">
        <small>
          <ul class="list-unstyled eth-balances" id="eth-balances-`+address+`">
          </ul>
        </small>
      </div>
    </div>
    <div class="eth-address card-footer text-muted">
      <small>
        Address: <a class="card-footer-data" href="https://etherscan.io/address/`+address+`">`+address+`</a><br />
      </small>
    </div>
  </div>`;

  $(ethSelector).prepend(html);
}

var updateExchangeTotal = function(minor, price, totalSelector, priceSelector) {
  console.log('(updateExchangeTotal) minor: '+minor+' price:'+price);
  var total = (web3js.utils.fromWei(totalEth.toString(10)) * price)
  dollarCurrs = ['AUD', 'BBD', 'BMD', 'BZD', 'CAD', 'FJD', 'GYD', 'HKD', 'JMD', 'KYD', 'LRD',
'NAD', 'NZD', 'SBD', 'SGD', 'SRD', 'TTD', 'TWD', 'USD']

  if (minor == 'BTC') {
    total = roundTo(total, 8) + " &#8383;";
    price = price + " &#8383;";
  } else if (dollarCurrs.indexOf(minor) != -1) {
    total = formatCurrency(total);
    price = formatCurrency(price);
  } else {
    total = roundTo(total, 2);
  }
  $(totalSelector).html(total);
  $(priceSelector).html(price);
}

var updateEthTotal = function(addition, ethTotalSelector){
  // update total
  totalEth = totalEth.plus(addition);
  console.log("(eth total update) " + totalEth);
  var roundedTotal = roundTo(web3js.utils.fromWei(totalEth.toString(10)), 5)
  $(ethTotalSelector).text(roundedTotal);
  $(ethTotalSelector).change();
  $(document).attr('title', roundedTotal + "\u039e - wallmonitor")
}

var getEthBalance = function(address, ethSelector, ethTotalSelector){
  return web3js.eth.getBalance(address, function(e, r){
    // write address balance
    logEthBalance(address, web3js.utils.fromWei(r.toString(10)), ethSelector);
    updateEthTotal(r, ethTotalSelector);
  });
}

var logTokens = function(name, userAddress, balance, tokenSelector) {
  console.log('(logTokens) ' + userAddress + ": " + balance + ' ' + name);
  if(balance != 0) {
    $(tokenSelector).append('<li class="eth-balances-ck">'+balance+' ' + name + '</li>');
  }
}

var logTokenContracts = function(contracts, userAddress, tokenSelector) {
  for(i=0; i<contracts.length; i++){
    var address = contracts[i]['address'];
    var name = contracts[i]['name'];
    var contract = new web3js.eth.Contract(contracts[i]['abi'], address);
    contract.methods.balanceOf(userAddress).call(
      function(e, r){ logTokens(name, userAddress, r, tokenSelector);});
  }
}

walletBalances = function(addresses, tokenContracts, ethSelector, tokenSelector, ethTotalSelector) {
  for(var i=0; i<addresses.length; i++){
    // console.log('working on acct '+r[i]);
    if(addresses[i]) {
      getEthBalance(addresses[i], ethSelector, ethTotalSelector);
      // console.log(addresses[i]);
      $.initialize("#eth-balances-"+addresses[i], function() {
        var a = $(this).attr('id').split('-')[2];
        console.log('init token balances for '+a);
        logTokenContracts(tokenContracts, a, "#eth-balances-"+a);
      });
    }
  }
}
