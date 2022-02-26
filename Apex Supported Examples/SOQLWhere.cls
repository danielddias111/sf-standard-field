public class SOQLWhere {
    public static void test(){
        List<Account> accList = [select id from account where industry!=null];
    }
}