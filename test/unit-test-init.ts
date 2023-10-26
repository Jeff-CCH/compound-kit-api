import * as common from '@protocolink/common';

common.setNetwork(common.ChainId.polygon, { rpcUrl: 'https://rpc.ankr.com/polygon' });
common.setNetwork(common.ChainId.arbitrum, { rpcUrl: 'https://arbitrum.llamarpc.com' });
common.setNetwork(common.ChainId.base, { rpcUrl: 'https://base.blockpi.network/v1/rpc/public' });
