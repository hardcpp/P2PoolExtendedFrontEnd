var period = "day";

function LoadData() {
  $("#blocks").html("<tr><th>ID</th><th>Time</th><th>Hash and explorer link</th><th>Share</th></tr>");
  $("#payouts").html("<tr><th>Address</th><th>Amount in <span class=\"symbol\"></span></th></tr>");
  $("#miners").html("<tr><th>Miner</th><th>Hashrate</th><th>Dead hashrate</th></tr>");

  function values(o){ res = []; for(var x in o) res.push(o[x]); return res; }

  d3.json('/web/version', function(version) {
    d3.selectAll('#version').text(version);
  });
 
  d3.json('/web/currency_info', function(currency_info) {
    d3.selectAll('.symbol').text(currency_info.symbol);

    d3.json('/current_payouts', function(pays) {
      d3.json('/payout_addr', function(addr) {
        d3.select('#payout_addr').text(addr);
        d3.select('#payout_amount').text(addr in pays ? pays[addr] : 0);
      });

      var arr = []; for(var i in pays) arr.push(i); arr.sort(function(a, b){return pays[b] - pays[a]});

      var tr = d3.select('#payouts').selectAll().data(arr).enter().append('tr');
      tr.append('td').append('a').text(function(addr){return addr}).attr('href', function(addr){return currency_info.address_explorer_url_prefix + addr});
      tr.append('td').text(function(addr){return pays[addr]});

      var total_tr = d3.select('#payouts').append('tr');
      total_tr.append('td').append('strong').text('Total');
      total_tr.append('td').text(d3.sum(arr, function(addr){return pays[addr]}).toFixed(8));
    });

    d3.json('/recent_blocks', function(blocks) {
      var tr = d3.select('#blocks').selectAll().data(blocks).enter().append('tr');
      tr.append('td').text(function(block){return block.number});
      tr.append('td').text(function(block){return new Date(1000*block.ts).toString()});
      tr.append('td').append('a').text(function(block){return block.hash}).attr('href', function(block){return currency_info.block_explorer_url_prefix + block.hash});
      tr.append('td').append('a').text('>').attr('href', function(block){return 'share.html#' + block.share});
    });
  });
 
  $("#best_share").html("");
  $("#verified_heads").html("");
  $("#heads").html("");
  $("#verified_tails").html("");
  $("#tails").html("");
  d3.json('/web/best_share_hash', function(c) {
    d3.select('#best_share').append('a').attr('href', 'share.html#' + c).text(c.substr(-8));
  });
 
  function fill(url, id) {
    d3.json(url, function(d) {
      d.sort()
      d3.select(id).selectAll().data(d).enter().append('span').text(' ').append('a').attr('href', function(c){return 'share.html#' + c}).text(function(c){return c.substr(-8)});
    });
  }

  fill('/web/verified_heads', '#verified_heads');
  fill('/web/heads', '#heads');
  fill('/web/verified_tails', '#verified_tails');
  fill('/web/tails', '#tails');
  fill('/web/my_share_hashes', '#my_share_hashes');
}

var plot1;
var plot2;
function UpdateData() {
  function values(o){ res = []; for(var x in o) res.push(o[x]); return res; }

  d3.json('/local_stats', function(local_stats) {
    d3.select('#peers_in').text(local_stats.peers.incoming);
    d3.select('#peers_out').text(local_stats.peers.outgoing);

    var local = d3.sum(values(local_stats.miner_hash_rates));
    var local_dead = d3.sum(values(local_stats.miner_dead_hash_rates));
    d3.select('#local_rate').text(d3.format('.3s')(local) + 'H/s');
    d3.select('#local_doa').text(d3.format('.2p')(local_dead/local));

    d3.select('#shares_total').text(local_stats.shares.total);
    d3.select('#shares_orphan').text(local_stats.shares.orphan);
    d3.select('#shares_dead').text(local_stats.shares.dead);

    d3.select('#efficiency').text(local_stats.efficiency != null ? d3.format('.4p')(local_stats.efficiency) : '???')
    d3.select('#uptime_days').text(d3.format('.3f')(local_stats.uptime / 60 / 60 / 24));
    d3.select('#uptime_hours').text(d3.format('.3f')(local_stats.uptime / 60 / 60 ));
    d3.select('#block_value').text(local_stats.block_value);

    d3.select('#warnings').selectAll().data(local_stats.warnings).enter().append('p')
      .text(function(w){ return 'Warning: ' + w })
      .attr('style', 'color:red;border:1px solid red;padding:5px');

    var time_to_share = local_stats.attempts_to_share/local;
    d3.select('#time_to_share').text(d3.format('.3r')(time_to_share/3600) + " hours");
    d3.select('#time_to_share_minute').text(d3.format('.3r')(time_to_share / 60) + " ");

    d3.json('/global_stats', function(global_stats) {
      d3.select('#pool_rate').text(d3.format('.3s')(global_stats.pool_hash_rate) + 'H/s');
      d3.select('#pool_stale').text(d3.format('.2p')(global_stats.pool_stale_prop));
      d3.select('#difficulty').text(d3.format('.3r')(global_stats.min_difficulty));

      var time_to_block = local_stats.attempts_to_block/global_stats.pool_hash_rate;
      d3.select('#time_to_block').text(d3.format('.3r')(time_to_block/3600) + " hours");

      d3.select('#expected_payout_amount').text(d3.format('.3r')(local/global_stats.pool_hash_rate*local_stats.block_value*(1-local_stats.donation_proportion)));

      /// ============================================
      var data = [
        ['Local speed', local],['Local dead speed', local_dead], ['Global speed', global_stats.pool_hash_rate]
      ];

      if (plot2) {plot2.destroy();}
      $("#targetPlot2").remove();
      $("#SpeedChart").append("<div id='targetPlot2'></div>");
      plot2 = jQuery.jqplot ('targetPlot2', [data], { 
        seriesDefaults: {
          renderer: jQuery.jqplot.PieRenderer, 
          rendererOptions: {
            showDataLabels: true
          }
        }, 
        legend: { show:true, location: 'e' }
      });
    });

    /// ============================================
    var data = [
      ['Good', local_stats.shares.total - (local_stats.shares.orphan + local_stats.shares.dead)],['Dead', local_stats.shares.dead], ['Orphaned', local_stats.shares.orphan]
    ];

    if (plot1) {plot1.destroy();}
    $("#targetPlot1").remove();
    $("#ShareChart").append("<div id='targetPlot1'></div>");
    plot1 = jQuery.jqplot ('targetPlot1', [data], { 
      seriesDefaults: {
        renderer: jQuery.jqplot.PieRenderer, 
        rendererOptions: {
          showDataLabels: true
        }
      }, 
      legend: { show:true, location: 'e' }
    });
    /// Active miners
    var miners = [];
    for (var i in local_stats.miner_hash_rates) {
      var miner = new Object;
      miner.miner_name=i;
      miner.hash=local_stats.miner_hash_rates[i];
      miners.push(miner)
    };
    /// $('#miners').empty();
    var tr = d3.select("#miners").selectAll().data(miners).enter().append('tr');
    tr.append('td').text(function(miner){return miner.miner_name});
    tr.append('td').text(function(miner){return d3.format('.3s')(miner.hash) +'H/s'});
    tr.append('td').text(function(miner){return local_stats.miner_dead_hash_rates[miner.miner_name] != null ? d3.format('.3s')(local_stats.miner_dead_hash_rates[miner.miner_name]) + 'H/s' : '0H/s'});
  });


  /// Pool speed graph
  plot_later(d3.select("#main-local"), "H/s", "H", [
    {"url": "/web/graph_data/local_hash_rate/last_" + period, "color": "#00f", "label": "Total"},
    {"url": "/web/graph_data/local_dead_hash_rate/last_" + period, "color": "#f00", "label": "Dead"}
  ],1000,300);
}

function ChangeCurrentPeriod(p_Period, p_Sender) {
  period=p_Period;
  UpdateData();
  $('#scale_menu li').removeClass('active');
  $('#' + p_Sender).addClass('active');
}

function AutoRefresh() {
  if($("#autorefresh").prop('checked')) {
    UpdateData();
  }
}