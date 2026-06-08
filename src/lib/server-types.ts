type BaseEvent_SERVER = {
  _id: string;
  _rev: string;
  companyId: string;
  userId: string;
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;
  seqId: string;
  totalVehicleMiles: number;
  totalEngineHours: number;
  accumulatedVehicleMiles: number;
  elapsedEngineHours: number;
  distSinceLastValidCoords: number;
  isLive: boolean;
  recordStatus: {
    id: string;
  };
  recordOrigin: {
    id: string;
  };
  eventCode: {
    id: string;
  };
  eventTime: {
    timestamp: number;
    logDate: {
      date: string;
      timeZone: {
        id: string;
      };
      logStartOffset: number;
    };
  };
  vehicle: {
    id: string;
    name: string;
    vin: string;
  };
  location: {
    lat: number;
    lon: number;
    calculatedLocation: string;
    source: string;
    state: string;
    timestamp: number;
  };
  eld: {
    id: string;
    serialNumber: string;
    sn: string;
  };
  suggestedEditEventIds: [];
  av: string;
  pd: false;
  at: true;
  type: {
    id: string;
  };
  dSTime: number;
  dId: string;
  stime: number;
  eventComment: string;
};

export type DailyLog = {
  _id: string;
  _rev: string;

  companyId: string;
  userId: string;

  createdBy: string;
  createdAt: number;

  updatedBy: string;
  updatedAt: number;

  logDate: {
    date: string;

    timeZone: {
      id: string;
    };

    logStartOffset: number;
  };

  form: {
    driver: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;

      driverInfo: {
        companyDriverId: string;

        licenseNumber: string;

        licenseState: {
          id: string;
        };

        homeTerminal: {
          id: string;
        };

        hosSettings: {
          pcAllowed: boolean;
          ymAllowed: boolean;

          is16hShortHaulExceptionAllowed: boolean;

          exempt: boolean;

          suggestedEventOriginIsDriver: boolean;

          cycle: {
            id: string;
          };

          cargoType: {
            id: string;
          };

          restartHours: {
            id: string;
          };

          restBreak: {
            id: string;
          };

          rv: number;
        };

        avi: unknown[];
      };
    };

    trailers: string[];

    vehicles: string[];

    shippingDocuments: string[];

    company: {
      id: string;
      name: string;

      street: string;
      city: string;
      zipCode: string;

      timeZone: {
        id: string;
      };

      dotNumber: string;

      state: {
        id: string;
      };

      terminals: {
        id: string;

        logStartOffset: number;

        street: string;
        city: string;
        zipCode: string;

        timeZone: {
          id: string;
        };

        state: {
          id: string;
        };
      }[];
    };

    lud: boolean;
    cl: boolean;
  };

  type: {
    id: string;
  };

  stime: number;

  dSTime: number;

  dId: string;
};

const examples = [
  // ON DUTY
  {
    _id: "HosEvent:8jgfQYlMJp",
    _rev: "5-c1cefd2154f1dddce5b1831054e7cdc3",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:94yC2p42Rf",
    createdBy: "User:94yC2p42Rf",
    createdAt: 1779861122095,
    updatedBy: "User:fDGiAf4Hh1",
    updatedAt: 1780342920754,
    seqId: "db6",
    totalVehicleMiles: 683221,
    totalEngineHours: 8436.1,
    accumulatedVehicleMiles: 195,
    elapsedEngineHours: 8.9,
    distSinceLastValidCoords: 0,
    isLive: true,
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "DRIVER",
    },
    eventCode: {
      id: "DS_ON",
    },
    eventTime: {
      timestamp: 1779862922093,
      logDate: {
        date: "2026/05/27",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:2Dl-Z1fYj6",
      name: "186",
      vin: "4V4NC9EH5LN253049",
    },
    location: {
      lat: 39.90101,
      lon: -83.724424,
      calculatedLocation: "5mi ESE from Springfield, OH",
      source: "E",
      state: "Ohio",
      timestamp: 1779861120000,
    },
    eld: {
      id: "Eld:ZGuSxOjraZw",
      serialNumber: "E9:E7:87:EC:74:C3",
      sn: "3B5000078118",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "de8ea7e4129e4d8c",
    stime: 1780342920754,
    eventComment: "Delivery",
  },

  // OFF DUTY
  {
    _id: "HosEvent:qmpzf3r3l",
    _rev: "1-cec40eb64aa7d4a4e4a354bd5dd312dd",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:94yC2p42Rf",
    createdBy: "User:I_AxceBn9n",
    createdAt: 1780564948901,
    seqId: "dc9",
    totalVehicleMiles: 683405,
    totalEngineHours: 8439.5,
    accumulatedVehicleMiles: 379,
    elapsedEngineHours: 92,
    distSinceLastValidCoords: 0,
    isLive: true,
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "DRIVER",
    },
    eventCode: {
      id: "DS_OFF",
    },
    eventTime: {
      timestamp: 1780125351000,
      logDate: {
        date: "2026/05/30",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:2Dl-Z1fYj6",
      name: "186",
      vin: "4V4NC9EH5LN253049",
    },
    location: {
      lat: 38.312759,
      lon: -81.708573,
      calculatedLocation: "4mi SSE from Dunbar, WV",
      source: "E",
      state: "West Virginia",
      timestamp: 1780160058000,
    },
    eld: {
      id: "Eld:ZGuSxOjraZw",
      serialNumber: "E9:E7:87:EC:74:C3",
      sn: "3B5000078118",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "de8ea7e4129e4d8c",
    stime: 1780564948901,
  },

  // DRIVING
  {
    _id: "HosEvent:F7WAr_MnEDE",
    _rev: "2-be51fdf50f17046eac8e086a57385c61",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:94yC2p42Rf",
    createdBy: "User:94yC2p42Rf",
    createdAt: 1780219026353,
    updatedBy: "User:fDGiAf4Hh1",
    updatedAt: 1780342927754,
    seqId: "ded",
    totalVehicleMiles: 683940,
    totalEngineHours: 8450.4,
    accumulatedVehicleMiles: 143,
    elapsedEngineHours: 3.8,
    distSinceLastValidCoords: 0,
    isLive: true,
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "DS_D",
    },
    eventTime: {
      timestamp: 1780219026242,
      logDate: {
        date: "2026/05/31",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:2Dl-Z1fYj6",
      name: "186",
      vin: "4V4NC9EH5LN253049",
    },
    location: {
      calculatedLocation: "2mi NNE from Napoleon, OH",
      lat: 41.415755,
      lon: -84.108725,
      source: "E",
      state: "Ohio",
      timestamp: 1780219025000,
    },
    eld: {
      id: "Eld:ZGuSxOjraZw",
      serialNumber: "E9:E7:87:EC:74:C3",
      sn: "3B5000078118",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "de8ea7e4129e4d8c",
    stime: 1780342927754,
  },

  // sleeper
  {
    _id: "HosEvent:VwNe-etx9Q",
    _rev: "4-b7431d95b2ce90b121cf51f9abd13a3a",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:94yC2p42Rf",
    createdBy: "User:94yC2p42Rf",
    createdAt: 1780292721661,
    updatedBy: "User:fDGiAf4Hh1",
    updatedAt: 1780342930749,
    seqId: "e06",
    totalVehicleMiles: 684232,
    totalEngineHours: 8457.5,
    accumulatedVehicleMiles: 43,
    elapsedEngineHours: 13.6,
    distSinceLastValidCoords: 0,
    isLive: true,
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "DRIVER",
    },
    eventCode: {
      id: "DS_SB",
    },
    eventTime: {
      timestamp: 1780284801658,
      logDate: {
        date: "2026/05/31",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:2Dl-Z1fYj6",
      name: "186",
      vin: "4V4NC9EH5LN253049",
    },
    location: {
      lat: 41.9112054,
      lon: -87.8789253,
      calculatedLocation: "Northlake, IL",
      source: "M",
      state: "Illinois",
      timestamp: 1780292718315,
    },
    eld: {
      id: "Eld:ZGuSxOjraZw",
      serialNumber: "E9:E7:87:EC:74:C3",
      sn: "3B5000078118",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "de8ea7e4129e4d8c",
    stime: 1780342930749,
  },
  // off duty waiting time
  {
    _id: "HosEvent:lnsyl3i58",
    _rev: "1-90af054e13c6de1e0bc316fc61af3d2d",
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "DRIVER",
    },
    eventCode: {
      id: "DS_WT",
    },
    location: {
      lat: 1,
      lon: 1,
      calculatedLocation: "5172mi SE from Ellsworth, ME",
      source: "E",
      state: "Maine",
      timestamp: 1780530101648,
    },
    malfuncIndicatorStatus: false,
    diagnosticIndicatorStatus: false,
    suggestedEditEventIds: [],
    type: {
      id: "HosEvent",
    },
    isLive: true,
    dSTime: -1,
    createdBy: "User:I_AxceBn9n",
    userId: "User:aMmryBJrm3",
    companyId: "Company:jAHAjaEwXen",
    eventTime: {
      logDate: {
        logStartOffset: 0,
        date: "2026/05/28",
        timeZone: {
          id: "CT",
        },
      },
      timestamp: 1780016410000,
    },
    dId: "2ee580265ee79ea4",
    totalVehicleMiles: 15,
    totalEngineHours: 15,
    seqId: "80",
    eld: {
      id: "Eld:yhVvnq5Ncra",
      serialNumber: "FC:C0:83:B4:51:72",
      sn: "3B5000185349",
    },
    vehicle: {
      id: "Vehicle:CKkr9fzkry",
      name: "100",
      vin: "4V4NC9EH2GN968716",
    },
    createdAt: 1780573612416,
    stime: 1780573612416,
  },
  // CERTIFICATION 1
  {
    _id: "HosEvent:kpuKcN4NE-",
    _rev: "1-77f1a1e53bfd5bb316829df6e945083b",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:94yC2p42Rf",
    createdBy: "User:I_AxceBn9n",
    createdAt: 1780463829003,
    seqId: "de3",
    isLive: true,
    eventCode: {
      id: "DR_CERT_1",
    },
    eventTime: {
      timestamp: 1780205445000,
      logDate: {
        date: "2026/05/31",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:2Dl-Z1fYj6",
      name: "186",
      vin: "4V4NC9EH5LN253049",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "de8ea7e4129e4d8c",
    stime: 1780463829003,
    updatedBy: "User:fDGiAf4Hh1",
    updatedAt: 1780342925805,
    certifiedRecordLogDate: {
      date: "2026/05/30",
      timeZone: {
        id: "CT",
      },
      logStartOffset: 0,
    },
  },
  // certification 2
  {
    _id: "HosEvent:cm0fwhmp7",
    _rev: "1-a1d273e84a8991b4c2ae5ce49414ba26",
    recordOrigin: {
      id: "DRIVER",
    },
    eventCode: {
      id: "DR_CERT_2",
    },
    malfuncIndicatorStatus: false,
    diagnosticIndicatorStatus: false,
    suggestedEditEventIds: [],
    type: {
      id: "HosEvent",
    },
    isLive: true,
    dSTime: -1,
    createdBy: "User:I_AxceBn9n",
    userId: "User:aMmryBJrm3",
    companyId: "Company:jAHAjaEwXen",
    eventTime: {
      logDate: {
        logStartOffset: 0,
        date: "2026/05/28",
        timeZone: {
          id: "CT",
        },
      },
      timestamp: 1780016412000,
    },
    dId: "2ee580265ee79ea4",
    seqId: "81",
    vehicle: {
      id: "Vehicle:CKkr9fzkry",
      name: "100",
      vin: "4V4NC9EH2GN968716",
    },
    createdAt: 1780573612424,
    stime: 1780573612424,
    certifiedRecordLogDate: {
      date: "2026/05/27",
      timeZone: {
        id: "CT",
      },
      logStartOffset: 0,
    },
  },
  // certification 9
  {
    _id: "HosEvent:beqfce0rq",
    _rev: "1-e8e196d054ebdbc6939bc942e80a11ae",
    recordOrigin: {
      id: "DRIVER",
    },
    eventCode: {
      id: "DR_CERT_9",
    },
    malfuncIndicatorStatus: false,
    diagnosticIndicatorStatus: false,
    suggestedEditEventIds: [],
    type: {
      id: "HosEvent",
    },
    isLive: true,
    dSTime: -1,
    createdBy: "User:I_AxceBn9n",
    userId: "User:aMmryBJrm3",
    companyId: "Company:jAHAjaEwXen",
    eventTime: {
      logDate: {
        logStartOffset: 0,
        date: "2026/05/28",
        timeZone: {
          id: "CT",
        },
      },
      timestamp: 1780016414000,
    },
    dId: "2ee580265ee79ea4",
    seqId: "82",
    vehicle: {
      id: "Vehicle:CKkr9fzkry",
      name: "100",
      vin: "4V4NC9EH2GN968716",
    },
    createdAt: 1780573612521,
    stime: 1780573612521,
    certifiedRecordLogDate: {
      date: "2026/05/27",
      timeZone: {
        id: "CT",
      },
      logStartOffset: 0,
    },
  },
  // engine down reduced
  {
    _id: "HosEvent:8ijyfgf2l",
    _rev: "1-735b396731901ed8ff7e605cc0f47c7f",
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "ENG_DOWN_REDUCED",
    },
    location: {
      lat: 1,
      lon: 1,
      calculatedLocation: "5172mi SE from Ellsworth, ME",
      source: "E",
      state: "Maine",
      timestamp: 1780530101648,
    },
    malfuncIndicatorStatus: false,
    diagnosticIndicatorStatus: false,
    suggestedEditEventIds: [],
    type: {
      id: "HosEvent",
    },
    isLive: true,
    dSTime: -1,
    createdBy: "User:I_AxceBn9n",
    userId: "User:aMmryBJrm3",
    companyId: "Company:jAHAjaEwXen",
    eventTime: {
      logDate: {
        logStartOffset: 0,
        date: "2026/05/28",
        timeZone: {
          id: "CT",
        },
      },
      timestamp: 1780016408000,
    },
    dId: "2ee580265ee79ea4",
    totalVehicleMiles: 15,
    totalEngineHours: 15,
    seqId: "7f",
    eld: {
      id: "Eld:yhVvnq5Ncra",
      serialNumber: "FC:C0:83:B4:51:72",
      sn: "3B5000185349",
    },
    vehicle: {
      id: "Vehicle:CKkr9fzkry",
      name: "100",
      vin: "4V4NC9EH2GN968716",
    },
    createdAt: 1780573612309,
    stime: 1780573612309,
  },
  // engine up normal
  {
    _id: "HosEvent:t8o8J5eE9-",
    _rev: "1-00a75872c7c0d8bdf2b7b83f1e611aaa",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:94yC2p42Rf",
    createdBy: "User:fDGiAf4Hh1",
    createdAt: 1780342929823,
    seqId: "e00",
    totalVehicleMiles: 684212,
    totalEngineHours: 8456.4,
    accumulatedVehicleMiles: 23,
    elapsedEngineHours: 9,
    distSinceLastValidCoords: 0,
    isLive: true,
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "ENG_UP_NORMAL",
    },
    eventTime: {
      timestamp: 1780279433283,
      logDate: {
        date: "2026/05/31",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:2Dl-Z1fYj6",
      name: "186",
      vin: "4V4NC9EH5LN253049",
    },
    location: {
      lat: 41.753993,
      lon: -87.798752,
      calculatedLocation: "Bridgeview, IL",
      source: "E",
      state: "Illinois",
      timestamp: 1780276003000,
    },
    eld: {
      id: "Eld:ZGuSxOjraZw",
      serialNumber: "E9:E7:87:EC:74:C3",
      sn: "3B5000078118",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "de8ea7e4129e4d8c",
    stime: 1780342929823,
    updatedBy: "User:I_AxceBn9n",
    updatedAt: 1780334398032,
  },
  // eng down normal
  {
    _id: "HosEvent:PmVOwIbEeFS",
    _rev: "5-924c77e4993aa92cd4b81bebcb9d4cb5",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:94yC2p42Rf",
    createdBy: "User:94yC2p42Rf",
    createdAt: 1780328330833,
    updatedBy: "User:I_AxceBn9n",
    updatedAt: 1780356411592,
    seqId: "e14",
    totalVehicleMiles: 684493,
    totalEngineHours: 8462.9,
    accumulatedVehicleMiles: 304,
    elapsedEngineHours: 23.5,
    distSinceLastValidCoords: 0,
    isLive: true,
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "ENG_DOWN_NORMAL",
    },
    eventTime: {
      timestamp: 1780304330731,
      logDate: {
        date: "2026/06/01",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:2Dl-Z1fYj6",
      name: "186",
      vin: "4V4NC9EH5LN253049",
    },
    location: {
      calculatedLocation: "6mi WNN from Batesville, IN",
      lat: 39.318767,
      lon: -85.328418,
      source: "E",
      state: "Indiana",
      timestamp: 1780328329000,
    },
    eld: {
      id: "Eld:ZGuSxOjraZw",
      serialNumber: "E9:E7:87:EC:74:C3",
      sn: "3B5000078118",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "de8ea7e4129e4d8c",
    stime: 1780356411592,
  },
  // intermediate normal
  {
    _id: "HosEvent:UxTokKoD53",
    _rev: "6-7f125d77dcde8f8d0518f73bb61681d1",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:94yC2p42Rf",
    createdBy: "User:94yC2p42Rf",
    createdAt: 1780177910586,
    updatedBy: "User:fDGiAf4Hh1",
    updatedAt: 1780342923782,
    seqId: "dd2",
    totalVehicleMiles: 683600,
    totalEngineHours: 8442.8,
    accumulatedVehicleMiles: 206,
    elapsedEngineHours: 4,
    distSinceLastValidCoords: 0,
    isLive: true,
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "LOG_NORMAL_PRECISION",
    },
    eventTime: {
      timestamp: 1780139501397,
      logDate: {
        date: "2026/05/30",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:2Dl-Z1fYj6",
      name: "186",
      vin: "4V4NC9EH5LN253049",
    },
    location: {
      calculatedLocation: "1mi NE from Washington, PA",
      lat: 40.186133,
      lon: -80.233043,
      source: "E",
      state: "Pennsylvania",
      timestamp: 1780177904000,
    },
    eld: {
      id: "Eld:ZGuSxOjraZw",
      serialNumber: "E9:E7:87:EC:74:C3",
      sn: "3B5000078118",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "de8ea7e4129e4d8c",
    stime: 1780342923782,
  },
  // intermediate reduced
  {
    _id: "HosEvent:zbz43166x",
    _rev: "1-9ffb6d4b04dff2100ed5c21dbd39d214",
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "LOG_REDUCED_PRECISION",
    },
    location: {
      lat: 1,
      lon: 1,
      calculatedLocation: "5172mi SE from Ellsworth, ME",
      source: "E",
      state: "Maine",
      timestamp: 1780530101648,
    },
    malfuncIndicatorStatus: false,
    diagnosticIndicatorStatus: false,
    suggestedEditEventIds: [],
    type: {
      id: "HosEvent",
    },
    isLive: true,
    dSTime: -1,
    createdBy: "User:I_AxceBn9n",
    userId: "User:aMmryBJrm3",
    companyId: "Company:jAHAjaEwXen",
    eventTime: {
      logDate: {
        logStartOffset: 0,
        date: "2026/05/28",
        timeZone: {
          id: "CT",
        },
      },
      timestamp: 1780016406000,
    },
    dId: "2ee580265ee79ea4",
    totalVehicleMiles: 15,
    totalEngineHours: 15,
    seqId: "7e",
    eld: {
      id: "Eld:yhVvnq5Ncra",
      serialNumber: "FC:C0:83:B4:51:72",
      sn: "3B5000185349",
    },
    vehicle: {
      id: "Vehicle:CKkr9fzkry",
      name: "100",
      vin: "4V4NC9EH2GN968716",
    },
    createdAt: 1780573612324,
    stime: 1780573612324,
  },
  // diag logged
  {
    _id: "HosEvent:BWCKino4LGK",
    _rev: "3-49bd64787ebb94172cd7e820fcd8fcd8",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:ZtI4Fyt-eO",
    createdBy: "User:ZtI4Fyt-eO",
    createdAt: 1780193336290,
    updatedBy: "User:xE1UGbROw",
    updatedAt: 1780500623489,
    seqId: "14a1",
    totalVehicleMiles: 558415,
    totalEngineHours: 1050,
    isLive: true,
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "DIAG_LOGGED",
    },
    fc: {
      id: "D_POWER",
    },
    eventTime: {
      timestamp: 1780138461965,
      logDate: {
        date: "2026/05/30",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:e0KCmzSKRH",
      name: "258",
      vin: "4V4NC9EH5LN236834",
    },
    location: {
      calculatedLocation: "3mi SSW from Mcdonough, GA",
      lat: 33.400955,
      lon: -84.165894,
      source: "E",
      state: "Georgia",
      timestamp: 1780138461000,
    },
    eld: {
      id: "Eld:g8zImFCi0YK",
      serialNumber: "C5:FA:7A:2B:8D:06",
      sn: "3B5000163682",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "09af11e686f23d69",
    dg: {
      cm: "pw:eeo",
    },
    stime: 1780500623489,
  },
  // diag cleared
  {
    _id: "HosEvent:1FdIFT8RqcO",
    _rev: "3-6a2c9d394ae2060bd1072090b556d4d5",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:ZtI4Fyt-eO",
    createdBy: "User:ZtI4Fyt-eO",
    createdAt: 1780193336298,
    updatedBy: "User:xE1UGbROw",
    updatedAt: 1780500623772,
    seqId: "14a3",
    totalVehicleMiles: 558415,
    totalEngineHours: 1050,
    isLive: true,
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "DIAG_CLEARED",
    },
    fc: {
      id: "D_POWER",
    },
    eventTime: {
      timestamp: 1780138462965,
      logDate: {
        date: "2026/05/30",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:e0KCmzSKRH",
      name: "258",
      vin: "4V4NC9EH5LN236834",
    },
    location: {
      calculatedLocation: "3mi SSW from Mcdonough, GA",
      lat: 33.400955,
      lon: -84.165894,
      source: "E",
      state: "Georgia",
      timestamp: 1780138461000,
    },
    eld: {
      id: "Eld:g8zImFCi0YK",
      serialNumber: "C5:FA:7A:2B:8D:06",
      sn: "3B5000163682",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "09af11e686f23d69",
    dg: {
      cm: "pw:eeo",
    },
    stime: 1780500623772,
  },
  // malf logged
  {
    _id: "HosEvent:sLxxKVaHLW",
    _rev: "3-7ffbfbc64a6f506262b7452b141a1259",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:4-NtyFj51N",
    createdBy: "User:4-NtyFj51N",
    createdAt: 1780032072260,
    updatedBy: "User:I_AxceBn9n",
    updatedAt: 1780329049432,
    seqId: "1966",
    totalVehicleMiles: 470960,
    totalEngineHours: 1667.3,
    isLive: true,
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "MALF_LOGGED",
    },
    fc: {
      id: "M_ENGINE_SYNC_COMPLIANCE",
    },
    eventTime: {
      timestamp: 1779973288000,
      logDate: {
        date: "2026/05/28",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:SYkNQZBOOE",
      name: " 191",
      vin: "4V4WC9EG4LN225514",
    },
    location: {
      calculatedLocation: "2mi WSW from Miami lakes, FL",
      lat: 25.896856,
      lon: -80.345064,
      source: "E",
      state: "Florida",
      timestamp: 1779973528000,
    },
    eld: {
      id: "Eld:XUqcEALxmfv",
      serialNumber: "C1:62:10:C7:9D:EA",
      sn: "3B5000171736",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "cb9952fa4b26fc23",
    dg: {
      cm: "es:cmd",
    },
    stime: 1780329049432,
  },
  // malf cleared
  {
    _id: "HosEvent:_713ZFOSwo",
    _rev: "4-92d351a59703af05729d8aafbef7dbf4",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:4-NtyFj51N",
    createdBy: "User:4-NtyFj51N",
    createdAt: 1779945694184,
    updatedBy: "User:I_AxceBn9n",
    updatedAt: 1780329048361,
    seqId: "1951",
    totalVehicleMiles: 470678,
    totalEngineHours: 1661.1,
    isLive: true,
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "MALF_CLEARED",
    },
    fc: {
      id: "M_ENGINE_SYNC_COMPLIANCE",
    },
    eventTime: {
      timestamp: 1779945694179,
      logDate: {
        date: "2026/05/28",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:SYkNQZBOOE",
      name: " 191",
      vin: "4V4WC9EG4LN225514",
    },
    location: {
      calculatedLocation: "2mi WSW from Miami lakes, FL",
      lat: 25.896845,
      lon: -80.345038,
      source: "E",
      state: "Florida",
      timestamp: 1779945691000,
    },
    eld: {
      id: "Eld:XUqcEALxmfv",
      serialNumber: "C1:62:10:C7:9D:EA",
      sn: "3B5000171736",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "cb9952fa4b26fc23",
    dg: {
      cm: "es:cmd",
    },
    stime: 1780329048361,
  },
  // login
  {
    _id: "HosEvent:mRqaYdZMgT",
    _rev: "2-8314c70653a04704c439bf5edddd7c82",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:EVEYXyp6MI",
    createdBy: "User:EVEYXyp6MI",
    createdAt: 1780509101494,
    updatedBy: "User:I_AxceBn9n",
    updatedAt: 1780563081531,
    seqId: "2e7",
    totalVehicleMiles: 357488,
    totalEngineHours: 16143.8,
    isLive: true,
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "DR_LOGIN",
    },
    eventTime: {
      timestamp: 1780510361489,
      logDate: {
        date: "2026/06/03",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:Zz69hnn_nk",
      name: "146",
      vin: "4V4NC9EH4RN655332",
    },
    eld: {
      id: "Eld:RP4Akl1jxMh",
      serialNumber: "C6:0F:D7:1A:5C:E7",
      sn: "3B5000088618",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "dde4f445ccc3d764",
    stime: 1780563081531,
  },
  // logout
  {
    _id: "HosEvent:lmYShpRUn0",
    _rev: "4-a8a1e9bcc575faa5386d761ab30d020a",
    companyId: "Company:jAHAjaEwXen",
    userId: "User:F8JKHfGc9d",
    createdBy: "User:F8JKHfGc9d",
    createdAt: 1779883997279,
    updatedBy: "User:I_AxceBn9n",
    updatedAt: 1780407196031,
    seqId: "1bdc",
    totalVehicleMiles: 741027,
    totalEngineHours: 16417.7,
    isLive: true,
    recordOrigin: {
      id: "ELD",
    },
    eventCode: {
      id: "DR_LOGOUT",
    },
    eventTime: {
      timestamp: 1779886097277,
      logDate: {
        date: "2026/05/27",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    vehicle: {
      id: "Vehicle:vG45JKBskl",
      name: "286",
      vin: "4V4NC9EH6MN282819",
    },
    eld: {
      id: "Eld:78U2l5qEuF0",
      serialNumber: "CA:73:87:B3:CF:25",
      sn: "3B5000300785",
    },
    suggestedEditEventIds: [],
    av: "2.200.109",
    pd: false,
    at: true,
    type: {
      id: "HosEvent",
    },
    dSTime: -1,
    dId: "14e6309825e99f9e",
    stime: 1780407196031,
  },
  // Personal
  {
    _id: "HosEvent:i68o91d4l",
    _rev: "1-7a805d040222e2ac94af98ae7ab90c43",
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "DRIVER",
    },
    eventCode: {
      id: "DR_IND_PC",
    },
    location: {
      lat: 1,
      lon: 1,
      calculatedLocation: "5172mi SE from Ellsworth, ME",
      source: "E",
      state: "Maine",
      timestamp: 1780530101648,
    },
    malfuncIndicatorStatus: false,
    diagnosticIndicatorStatus: false,
    suggestedEditEventIds: [],
    type: {
      id: "HosEvent",
    },
    isLive: true,
    dSTime: -1,
    createdBy: "User:I_AxceBn9n",
    userId: "User:aMmryBJrm3",
    companyId: "Company:jAHAjaEwXen",
    eventTime: {
      logDate: {
        logStartOffset: 0,
        date: "2026/05/28",
        timeZone: {
          id: "CT",
        },
      },
      timestamp: 1780016402000,
    },
    dId: "2ee580265ee79ea4",
    totalVehicleMiles: 15,
    totalEngineHours: 15,
    seqId: "7c",
    eld: {
      id: "Eld:yhVvnq5Ncra",
      serialNumber: "FC:C0:83:B4:51:72",
      sn: "3B5000185349",
    },
    vehicle: {
      id: "Vehicle:CKkr9fzkry",
      name: "100",
      vin: "4V4NC9EH2GN968716",
    },
    createdAt: 1780572535045,
    stime: 1780572535045,
  },
  // YARD MOVES
  {
    _id: "HosEvent:vb7tjo5vq",
    _rev: "1-00e1fae9f0c388a853d6c01577b6f3d5",
    recordStatus: {
      id: "ACTIVE",
    },
    recordOrigin: {
      id: "DRIVER",
    },
    eventCode: {
      id: "DR_IND_YM",
    },
    location: {
      lat: 1,
      lon: 1,
      calculatedLocation: "5172mi SE from Ellsworth, ME",
      source: "E",
      state: "Maine",
      timestamp: 1780530101648,
    },
    malfuncIndicatorStatus: false,
    diagnosticIndicatorStatus: false,
    suggestedEditEventIds: [],
    type: {
      id: "HosEvent",
    },
    isLive: true,
    dSTime: -1,
    createdBy: "User:I_AxceBn9n",
    userId: "User:aMmryBJrm3",
    companyId: "Company:jAHAjaEwXen",
    eventTime: {
      logDate: {
        logStartOffset: 0,
        date: "2026/05/28",
        timeZone: {
          id: "CT",
        },
      },
      timestamp: 1780016404000,
    },
    dId: "2ee580265ee79ea4",
    totalVehicleMiles: 15,
    totalEngineHours: 15,
    seqId: "7d",
    eld: {
      id: "Eld:yhVvnq5Ncra",
      serialNumber: "FC:C0:83:B4:51:72",
      sn: "3B5000185349",
    },
    vehicle: {
      id: "Vehicle:CKkr9fzkry",
      name: "100",
      vin: "4V4NC9EH2GN968716",
    },
    createdAt: 1780572777188,
    stime: 1780572777188,
  },

  /// VIO SHAPE FROM EXTREME
  {
    startTime: {
      timestamp: 1779703110066,
      logDate: {
        date: "2026/05/25",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    endTime: {
      timestamp: 1779779802659,
      logDate: {
        date: "2026/05/26",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    regulation: {
      id: "H14_DUTY_LIMIT",
    },
  },
  {
    startTime: {
      timestamp: 1779699484322,
      logDate: {
        date: "2026/05/25",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    endTime: {
      timestamp: 1779779802659,
      logDate: {
        date: "2026/05/26",
        timeZone: {
          id: "CT",
        },
        logStartOffset: 0,
      },
    },
    regulation: {
      id: "H11_DRIVING",
    },
  },
];
// VIO SHAPE EXTREME
