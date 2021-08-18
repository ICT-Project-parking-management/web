const mysql = require('mysql2/promise');
const { pool2 } = require("../../config/database");
const { dynamo } = require('../../config/dynamo');

const newPool = mysql.createPool(pool2); 

/**
 * update: 2021.08.08
 * author: serin
 * connect : RDS
 * desc : 등록된 주차장 리스트 조회
 */
 async function getParkingList() {
    const connection = await newPool.getConnection(async (conn) => conn);
    const getParkingListQuery = `SELECT parkingLotIndex, complexName FROM ParkingLot;`;
    const [rows] = await connection.query(getParkingListQuery);
    connection.release();
    return rows
}

/**
 * update: 2021.08.08
 * author: serin
 * connect : RDS
 * desc : 주차장 이름 조회
 */
 async function getComplexName(idx) {
    const connection = await newPool.getConnection(async (conn) => conn);
    const getComplexNameQuery = `
    SELECT complexName FROM ParkingLot WHERE parkingLotIndex = ${idx};
    `;
    const [rows] = await connection.query(getComplexNameQuery);
    connection.release();
    return rows;
}

/**
 * update: 2021.08.08
 * author: heedong
 * connect : RDS
 * desc : 주차장 층 조회
 */
 async function getFloors(idx) {
    const connection = await newPool.getConnection(async (conn) => conn);
    const Query = `
    SELECT DISTINCT floor FROM ParkingArea WHERE parkingLotIndex = ${idx};
    `;
    const [rows] = await connection.query(Query);
    connection.release();
    return rows;
}

/**
 * update: 2021.08.08
 * author: heedong
 * connect : RDS
 * desc : 층별 구역 정보 조회
 */
 async function getAreas(idx, floorName) {
    const connection = await newPool.getConnection(async (conn) => conn);
    const Query = `
    SELECT areaName, areaInfo FROM ParkingArea WHERE parkingLotIndex = ? AND floor = ?;
    `;
    const Params = [idx, floorName];
    const [rows] = await connection.query(Query, Params);
    connection.release();
    return rows;
}

async function getCurrParkData(idx, parkingLotInfo) {

    // idx = 주차장 인덱스
    // RDS => 해당 주차장의 주차구역 & 정보(장애인전용/전기차전용/일반전용) 확인
    // DynamoDB => 해당 주차장의 특정 주차구역의 가장 최신 정보(차정보/inOut 등) 확인
    // 주차된 위치 표시 & 주차 위반 여부 팝업

    var parkDataList = [];
    // const dynamo = new AWS.DynamoDB.DocumentClient();

    var floor;
    var area;

    // 210810 특정 층, 특정 구역에 대한 DynamoDB 데이터 조회
    // TODO: timestamp 기준 최근 하나만 불러오도록 수정 필요

    parkingLotInfo.forEach((e1) => {
        floor = e1.floorName;
        e1.areas.forEach((e2) => {
            area = e2.areaName;

            const params = {
                TableName: "parking-data",
                ProjectionExpression: "createdTime, carNum, disabled, electric, #inOut, parkLocation, floor",
                ExpressionAttributeNames: {
                    "#inOut": "inOut"
                },
                FilterExpression: 'parkLocation = :area AND floor = :floor',
                ExpressionAttributeValues: {
                    ":area": area,
                    ":floor": floor
                }
            }

            const result = dynamo.scan(params, (err, data) => {
                if (err) {
                    console.log(err)
                } else {
                    const { Items } = data;
                    //console.log(Items);
                }
            })


        })

    });

    // var areas = ['A1', 'A2'];

    // areas.forEach(async (area) => {
    //     // 특정 주차구역(parkLocation)의 가장 최근 값만 불러오도록 수정 필요
    //     const params = {
    //         TableName: "parking-data",
    //         Limit: 1,
    //         ScanIndexForward: false,
    //         ProjectionExpression: "createdTime, carNum, disabled, electric, #inOut, parkLocation",          
    //         ExpressionAttributeNames: {
    //             "#inOut": "inOut"
    //         },
    //         FilterExpression: 'parkLocation = :area',
    //         ExpressionAttributeValues: {
    //             ":area": area
    //         }
    //     }

    //     const result = await dynamo.scan(params, (err, data) => {
    //         if (err) {
    //             console.log(err)
    //         } else {
    //             const { Items } = data;
    //             //console.log('결과 >>', Items);
    //         }
    //     })

    // })
}
async function getMyArea(idx, userIndex) {
    const dynamo = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: dynamo_config.table_name,
        KeyConditionExpression: 'parkingId = :id',
        ExpressionAttributeValues: {
            ':id': id
        }
    }

    await dynamo.query(params, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            const { Items } = data;
            console.log(Items);
            return Items;
        }
    });
}

async function getUserList(userID, userPW){ //일치 불일치가 검증이 안됨
    const connection = await newPool.getConnection(async (conn)=> conn);
    const [idRows, idFields] = await connection.query(`SELECT userID, userPW FROM User WHERE userID = ? AND userPW = ?`, [userID, userPW]);

    if(idRows.length > 0){
        var userName = JSON.parse(JSON.stringify(idRows))[0].userID;
        var [indexRows, indexFields] = await connection.query(`SELECT userIndex FROM User WHERE userID = ?`, [userName]);
        var userIndex = JSON.parse(JSON.stringify(indexRows))[0].userIndex;
    }
    else{
        userName=[];
        userIndex=[];
    }

    connection.release();
    return [userName, userIndex];
} 

module.exports = {
    getParkingList,
    getComplexName,
    getFloors,
    getAreas,
    getCurrParkData,
    getMyArea,
    getUserList
};